package com.ruoyi.shop.mapper;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ShopOrderMapperXmlTest
{
    @Test
    void stockRestorationUsesThePersistedOrderItemSnapshot() throws IOException
    {
        String xml = mapperXml();
        String restore = statement(xml, "<update id=\"restoreStock\">", "</update>")
                .replaceAll("\\s+", " ");
        String insertItem = statement(xml,
                "<insert id=\"insertOrderItem\"", "</insert>");

        assertTrue(restore.contains("set stock = stock + #{quantity}"));
        assertFalse(restore.contains("stock_unlimited"));
        assertTrue(insertItem.contains("stock_deducted"));
        assertTrue(insertItem.contains("#{stockDeducted}"));
        assertTrue(xml.contains("property=\"stockDeducted\" column=\"stock_deducted\""));
        assertTrue(occurrences(xml, "oi.stock_deducted") >= 3,
                "all order-item read paths must hydrate the stock snapshot");
    }

    private String mapperXml() throws IOException
    {
        try (InputStream input = getClass().getClassLoader()
                .getResourceAsStream("mapper/shop/ShopOrderMapper.xml"))
        {
            assertNotNull(input, "ShopOrderMapper.xml must be available as a module resource");
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String statement(String xml, String startMarker, String endMarker)
    {
        int start = xml.indexOf(startMarker);
        assertTrue(start >= 0, "missing mapper statement: " + startMarker);
        int end = xml.indexOf(endMarker, start);
        assertTrue(end > start, "unterminated mapper statement: " + startMarker);
        return xml.substring(start, end + endMarker.length());
    }

    private int occurrences(String value, String needle)
    {
        int count = 0;
        int offset = 0;
        while ((offset = value.indexOf(needle, offset)) >= 0)
        {
            count++;
            offset += needle.length();
        }
        return count;
    }
}
