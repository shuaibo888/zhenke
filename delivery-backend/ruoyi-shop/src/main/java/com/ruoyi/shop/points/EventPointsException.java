package com.ruoyi.shop.points;

/**
 * 赛事系统积分接口异常。
 * <p>
 * {@code code} 为赛事系统返回的明确错误码（或商城侧的 NOT_CONFIGURED），表示结果确定、可安全终结；
 * {@code code} 为 null 表示网络超时、5xx 或响应解析失败，结果不确定，需保留 PENDING 用原 requestNo 重试。
 */
public class EventPointsException extends RuntimeException
{
    private final String code;
    private final Long availablePoints;

    public EventPointsException(String code, Long availablePoints, String message)
    {
        super(message);
        this.code = code;
        this.availablePoints = availablePoints;
    }

    public String code() { return code; }

    public Long availablePoints() { return availablePoints; }

    public boolean uncertain() { return code == null; }
}
