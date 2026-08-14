package com.ruoyi.shop.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

class WechatJsSdkServiceTest
{
    @Test
    void signsWechatParametersInRequiredOrder()
    {
        assertEquals("5eb7a20d16246c488d34aabb42c7bed27e8cf63e",
                WechatJsSdkService.sign("ticket-value", "nonce-value", 1710000000L,
                        "https://dzshop.vip/?product=42"));
    }
}
