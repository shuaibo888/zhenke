package com.ruoyi.shop.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopMerchantAuditLog;

public interface ShopMerchantMapper
{
    ShopMerchant selectById(Long merchantId);
    ShopMerchant selectByApplicationNo(String applicationNo);
    ShopMerchant selectByAccountUsername(String accountUsername);
    ShopMerchant selectByAdminUserId(Long adminUserId);
    List<ShopMerchant> selectAdminList(ShopMerchant query);
    List<ShopMerchantAuditLog> selectAuditLogs(Long merchantId);
    Long selectRoleIdByKey(String roleKey);
    int insert(ShopMerchant merchant);
    int resubmit(ShopMerchant merchant);
    int updateAudit(@Param("merchantId") Long merchantId, @Param("auditStatus") String auditStatus,
            @Param("auditRemark") String auditRemark, @Param("adminUserId") Long adminUserId,
            @Param("auditBy") String auditBy);
    int updateStatus(@Param("merchantId") Long merchantId, @Param("status") String status,
            @Param("updateBy") String updateBy);
    int insertAuditLog(ShopMerchantAuditLog auditLog);
}
