package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.page.TableDataInfo;
import com.github.pagehelper.PageHelper;
import com.ruoyi.shop.domain.dto.ShopPurchaseReportBody;
import com.ruoyi.shop.domain.dto.ShopVerificationReportBody;
import com.ruoyi.shop.domain.dto.ShopReportCommentBody;
import com.ruoyi.shop.service.ShopPurchaseReportService;
import com.ruoyi.shop.service.ShopReportResourceService;
import com.ruoyi.shop.service.ShopTrialService;
import com.ruoyi.shop.service.ShopVerificationReportCommentService;
import com.ruoyi.shop.service.ShopMerchantService;
import com.ruoyi.shop.service.ShopPublicMediaService;
import com.ruoyi.framework.config.ServerConfig;

@RestController
@RequestMapping("/shop/reports")
public class ShopVerificationReportController extends BaseController
{
    private final ShopTrialService trialService;
    private final ShopPurchaseReportService purchaseReportService;
    private final ShopVerificationReportCommentService commentService;
    private final ShopReportResourceService resourceService;
    private final ServerConfig serverConfig;
    private final ShopMerchantService merchantService;
    private final ShopPublicMediaService publicMedia;
    public ShopVerificationReportController(ShopTrialService trialService,
            ShopPurchaseReportService purchaseReportService,
            ShopVerificationReportCommentService commentService,
            ShopReportResourceService resourceService,
            ServerConfig serverConfig,
            ShopMerchantService merchantService,
            ShopPublicMediaService publicMedia)
    {
        this.trialService = trialService;
        this.purchaseReportService = purchaseReportService;
        this.commentService = commentService;
        this.resourceService = resourceService;
        this.serverConfig = serverConfig;
        this.merchantService = merchantService;
        this.publicMedia = publicMedia;
    }

    @Anonymous
    @GetMapping("/{reportId}")
    public AjaxResult detail(@PathVariable long reportId)
    {
        return AjaxResult.success(trialService.publishedReport(reportId));
    }

    @PostMapping
    public AjaxResult publish(@Valid @RequestBody ShopVerificationReportBody body)
    {
        return AjaxResult.success("验证报告已发布", trialService.publishReport(body));
    }

    @PostMapping("/purchase")
    public AjaxResult publishPurchaseReport(@Valid @RequestBody ShopPurchaseReportBody body)
    {
        return AjaxResult.success("购买甄客验已发布", purchaseReportService.publish(body));
    }

    @PostMapping("/resources")
    public AjaxResult uploadResource(@RequestParam("file") MultipartFile file)
    {
        String fileName = resourceService.upload(file);
        return AjaxResult.success("甄客验资源上传成功", serverConfig.getUrl() + fileName);
    }

    @PostMapping("/{reportId}/useful")
    public AjaxResult toggleUseful(@PathVariable long reportId)
    {
        return AjaxResult.success(trialService.toggleUseful(reportId));
    }

    @GetMapping("/me/list")
    public AjaxResult myReports()
    {
        return AjaxResult.success(trialService.myReports());
    }

    @Anonymous
    @GetMapping("/merchant/{merchantId}")
    public TableDataInfo merchantReports(@PathVariable long merchantId,
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "6") int pageSize)
    {
        merchantService.publicDetail(merchantId);
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 24)));
        var rows = trialService.merchantReports(merchantId);
        TableDataInfo result = getDataTable(rows);
        result.setRows(publicMedia.reports(rows));
        return result;
    }

    @Anonymous
    @GetMapping("/{reportId}/comments")
    public AjaxResult comments(@PathVariable long reportId)
    {
        return AjaxResult.success(commentService.comments(reportId));
    }

    @PostMapping("/{reportId}/comments")
    public AjaxResult createComment(@PathVariable long reportId,
            @Valid @RequestBody ShopReportCommentBody body)
    {
        return AjaxResult.success("评论发布成功", commentService.create(reportId, body));
    }

    @DeleteMapping("/{reportId}/comments/{commentId}")
    public AjaxResult deleteComment(@PathVariable long reportId, @PathVariable long commentId)
    {
        commentService.delete(reportId, commentId);
        return AjaxResult.success("评论已删除");
    }
}
