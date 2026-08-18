package com.ruoyi.shop.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopPointTransfer;
import com.ruoyi.shop.domain.vo.ShopPointBalance;
import com.ruoyi.shop.mapper.ShopPointMapper;
import com.ruoyi.shop.mapper.ShopPointTransferMapper;

/**
 * 积分划拨的本地事务执行器。
 * <p>
 * 三段式中的 T1（落单）与 T2（入账）各自独立事务，供 {@link ShopPointTransferService}
 * 跨 bean 编排调用，从而把外部 HTTP 调用隔离在本地事务之外。
 */
@Service
public class ShopPointTransferTransaction
{
    private final ShopPointTransferMapper transferMapper;
    private final ShopPointMapper pointMapper;

    public ShopPointTransferTransaction(ShopPointTransferMapper transferMapper, ShopPointMapper pointMapper)
    {
        this.transferMapper = transferMapper;
        this.pointMapper = pointMapper;
    }

    @Transactional
    public ShopPointTransfer openTransfer(long shopUserId, String sourceSystem, String phone, long points)
    {
        Long balance = pointMapper.selectBalanceForUpdate(shopUserId);
        if (balance == null)
        {
            throw new ServiceException("积分账户不存在或当前用户已停用");
        }
        ShopPointTransfer existing = transferMapper.selectPendingByUserAndSource(shopUserId, sourceSystem);
        if (existing != null)
        {
            return existing;
        }
        ShopPointTransfer transfer = new ShopPointTransfer();
        transfer.setRequestNo(generateRequestNo());
        transfer.setShopUserId(shopUserId);
        transfer.setSourceSystem(sourceSystem);
        transfer.setPhone(phone);
        transfer.setPoints(points);
        transfer.setStatus("PENDING");
        if (transferMapper.insertTransfer(transfer) == 0)
        {
            throw new ServiceException("划拨请求创建失败，请重试");
        }
        return transfer;
    }

    @Transactional
    public long settleTransfer(String requestNo, long shopUserId, long points, String transferNo)
    {
        ShopPointTransfer transfer = transferMapper.selectForUpdateByRequestNo(requestNo);
        if (transfer == null)
        {
            throw new ServiceException("划拨请求不存在");
        }
        if ("SUCCESS".equals(transfer.getStatus()))
        {
            ShopPointBalance summary = pointMapper.selectUserSummary(shopUserId);
            return summary == null || summary.getBalance() == null ? 0L : summary.getBalance();
        }
        if ("FAILED".equals(transfer.getStatus()))
        {
            throw new ServiceException("该划拨请求已失败，请重新发起");
        }
        Long balance = pointMapper.selectBalanceForUpdate(shopUserId);
        if (balance == null)
        {
            throw new ServiceException("积分账户不存在或当前用户已停用");
        }
        if (pointMapper.addTransferIn(shopUserId, points) == 0)
        {
            throw new ServiceException("积分账户更新失败，请重试");
        }
        long balanceAfter = balance + points;
        if (pointMapper.insertTransferRecord(shopUserId, points, balanceAfter, requestNo, transferNo) == 0)
        {
            throw new ServiceException("积分划入流水记录失败");
        }
        if (transferMapper.markSuccess(requestNo, transferNo) == 0)
        {
            throw new ServiceException("划拨请求状态更新失败，请重试");
        }
        return balanceAfter;
    }

    public List<ShopPointTransfer> pendingTransfersForRetry()
    {
        return transferMapper.selectPendingForRetry();
    }

    @Transactional
    public void failTransfer(String requestNo, String failCode, String failReason)
    {
        transferMapper.markFailed(requestNo, failCode, failReason);
    }

    private String generateRequestNo()
    {
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        int suffix = ThreadLocalRandom.current().nextInt(100000, 1000000);
        return "PT" + date + suffix;
    }
}
