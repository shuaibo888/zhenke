package com.ruoyi.shop.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.domain.vo.ShopHomeFeedItem;
import com.ruoyi.shop.service.ShopTrialService;

@Anonymous
@RestController
@RequestMapping("/shop/home")
public class ShopHomeController extends BaseController {
    private final ShopTrialService trialService;

    public ShopHomeController(ShopTrialService trialService) {
        this.trialService = trialService;
    }

    @GetMapping("/feed")
    public TableDataInfo feed(@RequestParam(required = false) String categoryCode,
                              @RequestParam(defaultValue = "ALL") String contentType,
                              @RequestParam(defaultValue = "ALL") String trialType) {
        startPage();
        List<ShopHomeFeedItem> rows = trialService.homeFeed(categoryCode, contentType, trialType);
        return getDataTable(rows);
    }
}
