package com.ruoyi.shop.domain;

public class ShopVerificationReportResource
{
    private Long resourceId;
    private Long reportId;
    private String resourceType;
    private String resourceUrl;
    private Integer resourceSort;

    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long resourceId) { this.resourceId = resourceId; }
    public Long getReportId() { return reportId; }
    public void setReportId(Long reportId) { this.reportId = reportId; }
    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }
    public String getResourceUrl() { return resourceUrl; }
    public void setResourceUrl(String resourceUrl) { this.resourceUrl = resourceUrl; }
    public Integer getResourceSort() { return resourceSort; }
    public void setResourceSort(Integer resourceSort) { this.resourceSort = resourceSort; }
}
