package com.ruoyi.shop.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import com.github.pagehelper.PageHelper;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.service.ShopProductService;

class ShopMallControllerTest
{
    private final ShopProductService productService = mock(ShopProductService.class);
    private final ShopMallController controller = new ShopMallController(productService);

    @AfterEach
    void clearPageHelper()
    {
        PageHelper.clearPage();
    }

    @Test
    void mallBusinessModuleKeepsLegacyCategoriesSeparateFromNewLocalLifeCategories()
    {
        when(productService.publicProducts(any(ShopProduct.class))).thenReturn(List.of());

        controller.products(null, "  自营好物  ", null, " mall ", 1, 12);

        ArgumentCaptor<ShopProduct> queryCaptor = ArgumentCaptor.forClass(ShopProduct.class);
        verify(productService).publicProducts(queryCaptor.capture());
        ShopProduct query = queryCaptor.getValue();
        assertTrue(query.getMallOnly());
        assertEquals("自营好物", query.getKeyword());
    }

    @Test
    void rejectsUnknownBusinessModuleInsteadOfSilentlyChangingProductScope()
    {
        assertThrows(ServiceException.class,
                () -> controller.products(null, null, null, "UNKNOWN", 1, 12));

        verify(productService, never()).publicProducts(any(ShopProduct.class));
    }

    @Test
    void keepsTotalCountEnabledOnLaterPagesForLoadMoreContract()
    {
        when(productService.publicProducts(any(ShopProduct.class))).thenReturn(List.of());

        controller.products(null, null, null, "MALL", 3, 12);

        assertTrue(PageHelper.getLocalPage().isCount());
        assertEquals(3, PageHelper.getLocalPage().getPageNum());
        assertEquals(12, PageHelper.getLocalPage().getPageSize());
    }
}
