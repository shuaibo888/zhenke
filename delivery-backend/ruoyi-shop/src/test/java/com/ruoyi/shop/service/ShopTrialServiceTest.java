package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.mapper.ShopUserMapper;

class ShopTrialServiceTest
{
    @Test
    void homeFeedPassesValidatedOnlineTrialFilterToMapper()
    {
        ShopTrialMapper mapper = mock(ShopTrialMapper.class);
        ShopTrialService service = service(mapper);
        when(mapper.selectHomeFeed("CATEGORY_1", "TRIAL", "ONLINE")).thenReturn(List.of());

        service.homeFeed("CATEGORY_1", "trial", "online");

        verify(mapper).selectHomeFeed("CATEGORY_1", "TRIAL", "ONLINE");
    }

    @Test
    void homeFeedRejectsTrialTypeFilterForNonTrialContent()
    {
        ShopTrialMapper mapper = mock(ShopTrialMapper.class);
        ShopTrialService service = service(mapper);

        assertThrows(ServiceException.class, () -> service.homeFeed(null, "REPORT", "OFFLINE"));

        verify(mapper, never()).selectHomeFeed(null, "REPORT", "OFFLINE");
    }

    @Test
    void homeFeedRejectsUnknownTrialType()
    {
        ShopTrialMapper mapper = mock(ShopTrialMapper.class);
        ShopTrialService service = service(mapper);

        assertThrows(ServiceException.class, () -> service.homeFeed(null, "TRIAL", "REMOTE"));

        verify(mapper, never()).selectHomeFeed(null, "TRIAL", "REMOTE");
    }

    private static ShopTrialService service(ShopTrialMapper mapper)
    {
        return new ShopTrialService(mapper, mock(ShopUserMapper.class),
                mock(ShopMerchantService.class), mock(ShopProductService.class));
    }
}
