package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopReportCommentBody
{
    @NotBlank(message = "请输入评论内容")
    @Size(max = 500, message = "评论内容不能超过500个字符")
    private String content;
    private Long replyToCommentId;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Long getReplyToCommentId() { return replyToCommentId; }
    public void setReplyToCommentId(Long replyToCommentId) { this.replyToCommentId = replyToCommentId; }
}
