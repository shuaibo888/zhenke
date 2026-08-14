package com.ruoyi.shop.phone;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class AliyunPhoneAuthServiceTest
{
    @Test
    void generatedVerificationCodeIsAlwaysSixDigits()
    {
        for (int i = 0; i < 100; i++)
        {
            assertTrue(AliyunPhoneAuthService.generateVerificationCode().matches("^\\d{6}$"));
        }
    }

    @Test
    void encodedVerificationCodeMatchesOnlyTheOriginalCode()
    {
        String encoded = AliyunPhoneAuthService.encodeVerificationCode("fixed-nonce", "012345");

        assertTrue(AliyunPhoneAuthService.matchesVerificationCode(encoded, "012345"));
        assertFalse(AliyunPhoneAuthService.matchesVerificationCode(encoded, "543210"));
        assertFalse(AliyunPhoneAuthService.matchesVerificationCode("legacy-provider-out-id", "012345"));
        assertFalse(AliyunPhoneAuthService.matchesVerificationCode(null, "012345"));
    }
}
