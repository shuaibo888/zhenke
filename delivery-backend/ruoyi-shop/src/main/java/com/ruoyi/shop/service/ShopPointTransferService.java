package com.ruoyi.shop.service;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopPointTransfer;
import com.ruoyi.shop.domain.vo.ShopPointTransferBalance;
import com.ruoyi.shop.domain.vo.ShopPointTransferResult;
import com.ruoyi.shop.domain.vo.ShopPointTransferSource;
import com.ruoyi.shop.points.EventPointsClient;
import com.ruoyi.shop.points.EventPointsException;
import com.ruoyi.shop.points.EventPointsTransferResult;
import com.ruoyi.shop.security.ShopAccountIdentity;

/**
 * 积分划拨门面：负责来源列表、余额查询与划拨三段式编排。
 * <p>
 * 外部 HTTP 调用位于本地事务之外；T1/T2 通过 {@link ShopPointTransferTransaction} 跨 bean 执行。
 */
@Service
public class ShopPointTransferService
{
    private static final Logger log = LoggerFactory.getLogger(ShopPointTransferService.class);
    private static final List<ShopPointTransferSource> SOURCES = List.of(
            new ShopPointTransferSource("EVENT", "燃赛", "燃值",
                    "https://img.cboo.cloud/dzshop/ransai.jpg"));

    private final EventPointsClient eventPointsClient;
    private final ShopPointTransferTransaction transferTransaction;
    private final ShopAccountService accountService;

    public ShopPointTransferService(EventPointsClient eventPointsClient,
            ShopPointTransferTransaction transferTransaction, ShopAccountService accountService)
    {
        this.eventPointsClient = eventPointsClient;
        this.transferTransaction = transferTransaction;
        this.accountService = accountService;
    }

    public List<ShopPointTransferSource> listSources()
    {
        return SOURCES;
    }

    public ShopPointTransferBalance queryBalance(String sourceSystem)
    {
        ShopPointTransferSource source = requireSource(sourceSystem);
        String phone = requireTransferPhone();
        long availablePoints;
        try
        {
            availablePoints = eventPointsClient.queryBalance(phone).availablePoints();
        }
        catch (EventPointsException exception)
        {
            throw translateBalance(exception);
        }
        return new ShopPointTransferBalance(source.getSourceSystem(), source.getSourceName(), availablePoints);
    }

    public ShopPointTransferResult transfer(String sourceSystem, long points)
    {
        ShopPointTransferSource source = requireSource(sourceSystem);
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        String phone = requireTransferPhone();
        validatePoints(points);

        ShopPointTransfer transfer = transferTransaction.openTransfer(
                shopUserId, source.getSourceSystem(), phone, points);

        EventPointsTransferResult upstream;
        try
        {
            upstream = eventPointsClient.transfer(
                    transfer.getRequestNo(), transfer.getPhone(), transfer.getPoints());
        }
        catch (EventPointsException exception)
        {
            if (exception.uncertain())
            {
                throw new ServiceException("划拨结果确认中，系统会自动完成入账，不会重复扣减");
            }
            transferTransaction.failTransfer(transfer.getRequestNo(), exception.code(), failReason(exception));
            throw translateTransfer(exception);
        }

        long balanceAfter = transferTransaction.settleTransfer(
                transfer.getRequestNo(), shopUserId, transfer.getPoints(), upstream.transferNo());

        return new ShopPointTransferResult(transfer.getRequestNo(), source.getSourceSystem(),
                source.getSourceName(), transfer.getPoints(), balanceAfter);
    }

    /**
     * 使用原 requestNo、手机号和数量重试结果不确定的划拨。
     * 赛事系统的划拨接口必须幂等：首次已经扣减时，重复请求返回原成功结果。
     */
    public void retryPendingTransfers()
    {
        for (ShopPointTransfer transfer : transferTransaction.pendingTransfersForRetry())
        {
            retryPendingTransfer(transfer);
        }
    }

    private void retryPendingTransfer(ShopPointTransfer transfer)
    {
        EventPointsTransferResult upstream;
        try
        {
            upstream = eventPointsClient.transfer(
                    transfer.getRequestNo(), transfer.getPhone(), transfer.getPoints());
        }
        catch (EventPointsException exception)
        {
            if (exception.uncertain())
            {
                log.warn("积分划拨重试结果仍不确定，保留待处理状态，requestNo={}", transfer.getRequestNo());
                return;
            }
            transferTransaction.failTransfer(transfer.getRequestNo(), exception.code(), failReason(exception));
            log.warn("积分划拨重试被赛事系统明确拒绝，requestNo={}, code={}",
                    transfer.getRequestNo(), exception.code());
            return;
        }
        try
        {
            transferTransaction.settleTransfer(transfer.getRequestNo(), transfer.getShopUserId(),
                    transfer.getPoints(), upstream.transferNo());
            log.info("待确认积分划拨已完成商城入账，requestNo={}", transfer.getRequestNo());
        }
        catch (Exception exception)
        {
            // 上游已经成功时仍保留 PENDING，下一轮继续使用同一 requestNo 重试并再次尝试本地入账。
            log.error("积分划拨上游成功但商城入账失败，将继续重试，requestNo={}",
                    transfer.getRequestNo(), exception);
        }
    }

    private ShopPointTransferSource requireSource(String sourceSystem)
    {
        for (ShopPointTransferSource source : SOURCES)
        {
            if (source.getSourceSystem().equals(sourceSystem))
            {
                return source;
            }
        }
        throw new ServiceException("不支持的积分来源系统");
    }

    private void validatePoints(long points)
    {
        if (points <= 0)
        {
            throw new ServiceException("划拨数量必须为正整数");
        }
    }

    private String requireTransferPhone()
    {
        String phone = StringUtils.trim(accountService.currentPhone());
        if (StringUtils.isEmpty(phone))
        {
            throw new ServiceException("请先完成手机号绑定");
        }
        return phone;
    }

    private String failReason(EventPointsException exception)
    {
        String message = exception.getMessage();
        if (message == null)
        {
            return "";
        }
        return message.length() > 255 ? message.substring(0, 255) : message;
    }

    private ServiceException translateBalance(EventPointsException exception)
    {
        if (exception.uncertain())
        {
            return new ServiceException("燃赛暂时无法连接，请稍后重试");
        }
        if ("USER_NOT_FOUND".equals(exception.code()) || "USER_DISABLED".equals(exception.code()))
        {
            return new ServiceException("燃赛账号不存在或已停用");
        }
        if ("INVALID_CLIENT".equals(exception.code()))
        {
            return new ServiceException("积分划拨服务认证失败，请联系管理员");
        }
        return new ServiceException("燃赛暂时无法查询燃值，请稍后重试");
    }

    private ServiceException translateTransfer(EventPointsException exception)
    {
        if ("INSUFFICIENT_POINTS".equals(exception.code()))
        {
            return new ServiceException("燃赛燃值不足，请刷新后重试");
        }
        if ("INVALID_POINTS".equals(exception.code()))
        {
            return new ServiceException("划拨数量非法，请重新输入");
        }
        if ("USER_NOT_FOUND".equals(exception.code()) || "USER_DISABLED".equals(exception.code()))
        {
            return new ServiceException("燃赛账号不存在或已停用");
        }
        if ("INVALID_CLIENT".equals(exception.code()))
        {
            return new ServiceException("积分划拨服务认证失败，请联系管理员");
        }
        if ("REQUEST_CONFLICT".equals(exception.code()))
        {
            return new ServiceException("划拨请求数据不一致，请联系客服");
        }
        return new ServiceException("积分划拨失败，请稍后重试");
    }
}
