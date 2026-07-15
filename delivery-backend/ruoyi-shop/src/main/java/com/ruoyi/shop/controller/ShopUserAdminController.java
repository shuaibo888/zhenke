package com.ruoyi.shop.controller;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.shop.domain.ShopMemberLevel;
import com.ruoyi.shop.domain.ShopUser;
import com.ruoyi.shop.domain.dto.ShopUserLevelBody;
import com.ruoyi.shop.domain.dto.ShopUserStatusBody;
import com.ruoyi.shop.service.ShopAccountService;

@RestController
@RequestMapping("/shop/admin/users")
public class ShopUserAdminController extends BaseController
{
    private final ShopAccountService accountService;

    public ShopUserAdminController(ShopAccountService accountService)
    {
        this.accountService = accountService;
    }

    @PreAuthorize("@ss.hasPermi('shop:user:list')")
    @GetMapping
    public TableDataInfo list(ShopUser query)
    {
        startPage();
        List<ShopUser> users = accountService.selectAdminUsers(query);
        return getDataTable(users);
    }

    @PreAuthorize("@ss.hasPermi('shop:user:query')")
    @GetMapping("/levels")
    public AjaxResult levels()
    {
        List<ShopMemberLevel> levels = accountService.selectEnabledLevels();
        return AjaxResult.success(levels);
    }

    @Log(title = "商城用户状态", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasPermi('shop:user:status')")
    @PutMapping("/{userId}/status")
    public AjaxResult updateStatus(@PathVariable long userId, @Valid @RequestBody ShopUserStatusBody body)
    {
        return toAjax(accountService.updateStatus(userId, body.getStatus(), getUsername()));
    }

    @Log(title = "商城用户等级", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasPermi('shop:user:edit')")
    @PutMapping("/{userId}/level")
    public AjaxResult updateLevel(@PathVariable long userId, @Valid @RequestBody ShopUserLevelBody body)
    {
        return toAjax(accountService.updateLevel(userId, body.getLevelId(), getUsername()));
    }
}
