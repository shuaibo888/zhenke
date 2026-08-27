package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.*;

public class ShopZhenkeCommentBody {
  @NotBlank
  @Size(max = 500)
  private String content;

  private Long replyToCommentId;

  public String getContent() {
    return content;
  }

  public void setContent(String v) {
    content = v;
  }

  public Long getReplyToCommentId() {
    return replyToCommentId;
  }

  public void setReplyToCommentId(Long v) {
    replyToCommentId = v;
  }
}
