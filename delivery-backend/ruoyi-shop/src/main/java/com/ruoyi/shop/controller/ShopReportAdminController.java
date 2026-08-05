package com.ruoyi.shop.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.github.pagehelper.PageHelper;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.service.ShopTrialService;

@RestController
@RequestMapping("/shop/admin/reports")
@PreAuthorize("@ss.hasRole('admin')")
public class ShopReportAdminController extends BaseController
{
    private final ShopTrialService trialService;

    public ShopReportAdminController(ShopTrialService trialService)
    {
        this.trialService = trialService;
    }

    @GetMapping
    public TableDataInfo list(@RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "10") int pageSize)
    {
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopVerificationReport> rows = trialService.adminReports();
        return getDataTable(rows);
    }

    @Log(title = "平台逻辑删除甄客验", businessType = BusinessType.DELETE)
    @DeleteMapping("/{reportId}")
    public AjaxResult delete(@PathVariable long reportId)
    {
        return AjaxResult.success(trialService.adminDeleteReport(reportId, getUserId(), getUsername()));
    }
}
