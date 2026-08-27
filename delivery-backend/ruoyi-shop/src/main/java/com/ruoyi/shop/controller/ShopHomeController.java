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
    public TableDataInfo feed(@RequestParam(required = false) Long productId,
                              @RequestParam(required = false) String categoryCode,
                              @RequestParam(required = false) String businessModule,
                              @RequestParam(defaultValue = "ALL") String contentType,
                              @RequestParam(defaultValue = "ALL") String trialType,
                              @RequestParam(required = false) String keyword,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "12") int pageSize) {
        List<ShopHomeFeedItem> rows = trialService.homeFeed(
                productId, categoryCode, businessModule, contentType, trialType, keyword, pageNum, pageSize);
        return getDataTable(rows);
    }

    @GetMapping("/search")
    public TableDataInfo search(@RequestParam String keyword,
                                @RequestParam(defaultValue = "1") int pageNum,
                                @RequestParam(defaultValue = "12") int pageSize) {
        List<ShopHomeFeedItem> rows = trialService.searchHomeFeed(keyword, pageNum, pageSize);
        return getDataTable(rows);
    }
}
