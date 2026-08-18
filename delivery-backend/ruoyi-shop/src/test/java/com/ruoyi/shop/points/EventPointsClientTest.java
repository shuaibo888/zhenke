package com.ruoyi.shop.points;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;

class EventPointsClientTest
{
    private final EventPointsClient client = new EventPointsClient(new EventPointsProperties());

    @Test
    void acceptsMatchingIdempotentSuccess()
    {
        JSONObject payload = JSON.parseObject("""
                {"code":0,"data":{"requestNo":"PT-1","transferNo":"EVENT-1","points":60,"remainingPoints":40}}
                """);

        EventPointsTransferResult result = client.parseTransferResult(payload, "PT-1", 60, "request-1");

        assertEquals("PT-1", result.requestNo());
        assertEquals("EVENT-1", result.transferNo());
        assertEquals(60, result.points());
        assertEquals(40, result.remainingPoints());
    }

    @Test
    void rejectsMismatchedRequestNumberAsUncertain()
    {
        JSONObject payload = JSON.parseObject("""
                {"code":0,"data":{"requestNo":"PT-OTHER","transferNo":"EVENT-1","points":60,"remainingPoints":40}}
                """);

        EventPointsException exception = assertThrows(EventPointsException.class,
                () -> client.parseTransferResult(payload, "PT-1", 60, "request-2"));

        assertTrue(exception.uncertain());
    }

    @Test
    void rejectsMismatchedTransferredPointsAsUncertain()
    {
        JSONObject payload = JSON.parseObject("""
                {"code":0,"data":{"requestNo":"PT-1","transferNo":"EVENT-1","points":30,"remainingPoints":70}}
                """);

        EventPointsException exception = assertThrows(EventPointsException.class,
                () -> client.parseTransferResult(payload, "PT-1", 60, "request-3"));

        assertTrue(exception.uncertain());
    }

    @Test
    void treatsAnyExplicitBusinessFailureAsDefinitive()
    {
        EventPointsException exception = assertThrows(EventPointsException.class,
                () -> client.parseResponse(200, "{\"code\":\"NEW_FAILURE_CODE\"}",
                        "request-4", "transfer"));

        assertEquals("NEW_FAILURE_CODE", exception.code());
        assertTrue(!exception.uncertain());
    }

    @Test
    void keepsServerErrorOutcomeUncertainEvenWhenBodyContainsCode()
    {
        EventPointsException exception = assertThrows(EventPointsException.class,
                () -> client.parseResponse(500, "{\"code\":\"SYSTEM_ERROR\"}",
                        "request-5", "transfer"));

        assertTrue(exception.uncertain());
    }
}
