package com.ruoyi.shop.mapper;

import com.ruoyi.shop.domain.ShopNotification;
import com.ruoyi.shop.domain.vo.ShopNotificationView;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface ShopNotificationMapper
{
    List<ShopNotificationView> selectNotifications(Long recipientShopUserId);

    int countUnread(Long recipientShopUserId);

    int insertNotification(ShopNotification notification);

    int markRead(@Param("notificationId") Long notificationId,
            @Param("recipientShopUserId") Long recipientShopUserId);

    int markAllRead(Long recipientShopUserId);
}
