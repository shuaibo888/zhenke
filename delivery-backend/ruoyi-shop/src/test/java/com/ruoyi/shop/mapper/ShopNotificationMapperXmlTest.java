package com.ruoyi.shop.mapper;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ShopNotificationMapperXmlTest
{
    @Test
    void inboxQueriesAndReadWritesAreRecipientScoped() throws IOException
    {
        String xml = mapperXml();
        String list = statement(xml, "<select id=\"selectNotifications\"", "</select>");
        String markOne = statement(xml, "<update id=\"markRead\"", "</update>");
        String markAll = statement(xml, "<update id=\"markAllRead\"", "</update>");

        assertTrue(list.contains("n.recipient_shop_user_id = #{recipientShopUserId}"));
        assertTrue(markOne.contains("notification_id = #{notificationId}"));
        assertTrue(markOne.contains("recipient_shop_user_id = #{recipientShopUserId}"));
        assertTrue(markAll.contains("recipient_shop_user_id = #{recipientShopUserId}"));
    }

    @Test
    void insertReliesOnTheStableDedupeKeyAndOnlyBuildsPostOrReportRoutes() throws IOException
    {
        String xml = mapperXml();
        String insert = statement(xml, "<insert id=\"insertNotification\"", "</insert>");
        String list = statement(xml, "<select id=\"selectNotifications\"", "</select>");

        assertTrue(insert.contains("dedupe_key"));
        assertTrue(insert.contains("on duplicate key update notification_id = notification_id"));
        assertTrue(list.contains("when 'POST' then concat('/posts/'"));
        assertTrue(list.contains("when 'REPORT' then concat('/reports/'"));
        assertTrue(list.contains("n.actor_shop_user_id is null then '甄客行运营'"));
        assertTrue(list.contains("n.actor_shop_user_id is null then 1 else 0 end system_generated"));
        assertTrue(!xml.contains("ENJOY"));
    }

    private String statement(String xml, String startMarker, String endMarker)
    {
        int start = xml.indexOf(startMarker);
        assertTrue(start >= 0, "missing mapper statement " + startMarker);
        int end = xml.indexOf(endMarker, start);
        assertTrue(end > start, "unterminated mapper statement " + startMarker);
        return xml.substring(start, end + endMarker.length());
    }

    private String mapperXml() throws IOException
    {
        try (InputStream input = getClass().getClassLoader()
                .getResourceAsStream("mapper/shop/ShopNotificationMapper.xml"))
        {
            assertNotNull(input, "notification mapper must be available as a module resource");
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
