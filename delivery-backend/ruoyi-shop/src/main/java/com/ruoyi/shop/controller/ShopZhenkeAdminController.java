package com.ruoyi.shop.controller;

import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.shop.domain.dto.ShopHomeBannerBody;
import com.ruoyi.shop.service.ShopZhenkeService;
import jakarta.validation.Valid;
import java.util.Date;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/shop/admin/zhenke")
@PreAuthorize("@ss.hasRole('admin')")
public class ShopZhenkeAdminController extends BaseController {
  private final ShopZhenkeService s;

  public ShopZhenkeAdminController(ShopZhenkeService s) {
    this.s = s;
  }

  @GetMapping("/posts")
  @PreAuthorize("@ss.hasRole('admin') and @ss.hasPermi('shop:zhenkePost:list')")
  public TableDataInfo posts(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) Long merchantId,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") Date publishedFrom,
      @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") Date publishedTo,
      @RequestParam(defaultValue = "1") int pageNum,
      @RequestParam(defaultValue = "10") int pageSize) {
    return getDataTable(
        s.adminPosts(keyword, merchantId, status, publishedFrom, publishedTo, pageNum, pageSize));
  }

  @GetMapping("/posts/{id}")
  @PreAuthorize("@ss.hasRole('admin') and @ss.hasPermi('shop:zhenkePost:query')")
  public AjaxResult post(@PathVariable long id) {
    return AjaxResult.success(s.adminDetail(id));
  }

  @Log(title = "删除甄客帖", businessType = BusinessType.DELETE)
  @DeleteMapping("/posts/{id}")
  @PreAuthorize("@ss.hasRole('admin') and @ss.hasPermi('shop:zhenkePost:remove')")
  public AjaxResult delete(@PathVariable long id) {
    s.adminDelete(id, getUserId());
    return AjaxResult.success();
  }

  @GetMapping("/banners")
  @PreAuthorize("@ss.hasRole('admin') and @ss.hasPermi('shop:banner:list')")
  public AjaxResult banners() {
    return AjaxResult.success(s.banners());
  }

  @PostMapping("/banners")
  @PreAuthorize("@ss.hasRole('admin') and @ss.hasPermi('shop:banner:add')")
  public AjaxResult add(@Valid @RequestBody ShopHomeBannerBody b) {
    return AjaxResult.success(s.saveBanner(null, b, getUsername()));
  }

  @PutMapping("/banners/{id}")
  @PreAuthorize("@ss.hasRole('admin') and @ss.hasPermi('shop:banner:edit')")
  public AjaxResult edit(@PathVariable long id, @Valid @RequestBody ShopHomeBannerBody b) {
    return AjaxResult.success(s.saveBanner(id, b, getUsername()));
  }

  @DeleteMapping("/banners/{id}")
  @PreAuthorize("@ss.hasRole('admin') and @ss.hasPermi('shop:banner:remove')")
  public AjaxResult remove(@PathVariable long id) {
    s.deleteBanner(id);
    return AjaxResult.success();
  }

  @PutMapping("/banners/{id}/status")
  @PreAuthorize("@ss.hasRole('admin') and @ss.hasPermi('shop:banner:status')")
  public AjaxResult status(@PathVariable long id, @RequestParam String status) {
    s.bannerStatus(id, status, getUsername());
    return AjaxResult.success();
  }
}
