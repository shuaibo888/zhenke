package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.domain.dto.ShopVerificationReportBody;
import com.ruoyi.shop.domain.dto.ShopReportCommentBody;
import com.ruoyi.shop.service.ShopTrialService;
import com.ruoyi.shop.service.ShopVerificationReportCommentService;

@RestController
@RequestMapping("/shop/reports")
public class ShopVerificationReportController
{
    private final ShopTrialService trialService;
    private final ShopVerificationReportCommentService commentService;
    public ShopVerificationReportController(ShopTrialService trialService,
            ShopVerificationReportCommentService commentService)
    {
        this.trialService = trialService;
        this.commentService = commentService;
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

    @GetMapping("/me/list")
    public AjaxResult myReports()
    {
        return AjaxResult.success(trialService.myReports());
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
