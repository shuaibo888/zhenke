package com.ruoyi.shop.controller;

import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.service.ShopNotificationService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/shop/notifications")
public class ShopNotificationController extends BaseController
{
    private final ShopNotificationService service;

    public ShopNotificationController(ShopNotificationService service)
    {
        this.service = service;
    }

    @GetMapping
    public TableDataInfo notifications(@RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "15") int pageSize)
    {
        return getDataTable(service.notifications(pageNum, pageSize));
    }

    @GetMapping("/unread-count")
    public AjaxResult unreadCount()
    {
        return AjaxResult.success(Map.of("unreadCount", service.unreadCount()));
    }

    @PutMapping("/{notificationId}/read")
    public AjaxResult markRead(@PathVariable long notificationId)
    {
        service.markRead(notificationId);
        return AjaxResult.success("消息已读");
    }

    @PutMapping("/read-all")
    public AjaxResult markAllRead()
    {
        service.markAllRead();
        return AjaxResult.success("全部消息已读");
    }
}
