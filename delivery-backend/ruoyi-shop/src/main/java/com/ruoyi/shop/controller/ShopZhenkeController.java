package com.ruoyi.shop.controller;

import com.github.pagehelper.PageHelper;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.domain.dto.*;
import com.ruoyi.shop.service.*;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/shop/zhenke")
public class ShopZhenkeController extends BaseController {
  private final ShopZhenkeService service;
  private final ShopReportResourceService resources;
  private final com.ruoyi.shop.map.TencentMapService map;

  public ShopZhenkeController(
      ShopZhenkeService s, ShopReportResourceService r, com.ruoyi.shop.map.TencentMapService map) {
    service = s;
    resources = r;
    this.map = map;
  }

  @Anonymous
  @GetMapping("/posts")
  public TableDataInfo posts(
      @RequestParam(defaultValue = "RECOMMEND") String zone,
      @RequestParam(required = false) Long placeId,
      @RequestParam(defaultValue = "1") int pageNum,
      @RequestParam(defaultValue = "12") int pageSize) {
    PageHelper.clearPage();
    return getDataTable(service.posts(zone, placeId, pageNum, pageSize));
  }

  @Anonymous
  @GetMapping("/posts/{id}")
  public AjaxResult detail(@PathVariable long id) {
    return AjaxResult.success(service.detail(id));
  }

  @PostMapping("/posts")
  public AjaxResult publish(@Valid @RequestBody ShopZhenkePostBody b) {
    return AjaxResult.success("发布成功", service.publish(b));
  }

  @GetMapping("/posts/me")
  public TableDataInfo mine(
      @RequestParam(defaultValue = "1") int pageNum,
      @RequestParam(defaultValue = "12") int pageSize) {
    return getDataTable(service.myPosts(pageNum, pageSize));
  }

  @DeleteMapping("/posts/{id}")
  public AjaxResult delete(@PathVariable long id) {
    service.deleteOwn(id);
    return AjaxResult.success("帖子已删除");
  }

  @PostMapping("/posts/{id}/useful")
  public AjaxResult useful(@PathVariable long id) {
    return AjaxResult.success(service.toggleUseful(id));
  }

  @Anonymous
  @GetMapping("/posts/{id}/comments")
  public AjaxResult comments(@PathVariable long id) {
    return AjaxResult.success(service.comments(id));
  }

  @PostMapping("/posts/{id}/comments")
  public AjaxResult comment(@PathVariable long id, @Valid @RequestBody ShopZhenkeCommentBody b) {
    return AjaxResult.success("评论成功", service.comment(id, b));
  }

  @DeleteMapping("/posts/{id}/comments/{cid}")
  public AjaxResult deleteComment(@PathVariable long id, @PathVariable long cid) {
    service.deleteComment(id, cid);
    return AjaxResult.success("评论已删除");
  }

  @PostMapping("/resources")
  public AjaxResult upload(@RequestParam("file") MultipartFile file) {
    String path = resources.upload(file);
    return AjaxResult.success("上传成功", service.registerUpload(path, file.getOriginalFilename()));
  }

  @Anonymous
  @GetMapping("/places/{id}")
  public AjaxResult place(@PathVariable long id) {
    return AjaxResult.success(service.place(id));
  }

  @Anonymous
  @GetMapping("/map/reverse")
  public AjaxResult reverse(@RequestParam BigDecimal latitude, @RequestParam BigDecimal longitude) {
    return AjaxResult.success(map.reverse(latitude, longitude));
  }

  @Anonymous
  @GetMapping("/map/search")
  public AjaxResult search(@RequestParam String keyword) {
    return AjaxResult.success(map.search(keyword));
  }

  @Anonymous
  @GetMapping("/merchant-options")
  public AjaxResult merchantOptions(
      @RequestParam(required = false, defaultValue = "") String keyword) {
    return AjaxResult.success(service.merchantOptions(keyword));
  }

  @Anonymous
  @GetMapping("/banners")
  public AjaxResult banners() {
    return AjaxResult.success(service.activeBanners());
  }
}
