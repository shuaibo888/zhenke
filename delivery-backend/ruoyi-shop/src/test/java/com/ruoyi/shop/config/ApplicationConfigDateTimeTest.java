package com.ruoyi.shop.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.Date;
import java.util.TimeZone;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.framework.config.ApplicationConfig;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

class ApplicationConfigDateTimeTest
{
    @Test
    void shouldSerializeApiDateTimeWithoutIsoTimezoneSuffix() throws Exception
    {
        ObjectMapper objectMapper = configuredObjectMapper();
        Date value = Date.from(Instant.parse("2026-08-18T09:22:37Z"));

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(new DateTimeSample(value, value)));

        assertEquals(format(value, "yyyy-MM-dd HH:mm:ss"), json.get("dateTime").asText());
        assertEquals(format(value, "yyyy-MM-dd"), json.get("dateOnly").asText());
    }

    private ObjectMapper configuredObjectMapper()
    {
        Jackson2ObjectMapperBuilder builder = Jackson2ObjectMapperBuilder.json();
        new ApplicationConfig().jacksonObjectMapperCustomization().customize(builder);
        return builder.build();
    }

    private String format(Date value, String pattern)
    {
        SimpleDateFormat formatter = new SimpleDateFormat(pattern);
        formatter.setTimeZone(TimeZone.getDefault());
        return formatter.format(value);
    }

    private static final class DateTimeSample
    {
        private final Date dateTime;
        private final Date dateOnly;

        private DateTimeSample(Date dateTime, Date dateOnly)
        {
            this.dateTime = dateTime;
            this.dateOnly = dateOnly;
        }

        public Date getDateTime()
        {
            return dateTime;
        }

        @JsonFormat(pattern = "yyyy-MM-dd")
        public Date getDateOnly()
        {
            return dateOnly;
        }
    }
}
