package com.ruoyi.shop.domain;

import java.util.Date;

public class ShopZhenkeEnjoyComment {
  private Long commentId;
  private Long enjoyId;
  private Long parentCommentId;
  private Long replyToCommentId;
  private Long shopUserId;
  private String userName;
  private String nickName;
  private String avatar;
  private String replyToName;
  private String content;
  private Date createTime;

  public Long getCommentId() { return commentId; }
  public void setCommentId(Long value) { commentId = value; }
  public Long getEnjoyId() { return enjoyId; }
  public void setEnjoyId(Long value) { enjoyId = value; }
  public Long getParentCommentId() { return parentCommentId; }
  public void setParentCommentId(Long value) { parentCommentId = value; }
  public Long getReplyToCommentId() { return replyToCommentId; }
  public void setReplyToCommentId(Long value) { replyToCommentId = value; }
  public Long getShopUserId() { return shopUserId; }
  public void setShopUserId(Long value) { shopUserId = value; }
  public String getUserName() { return userName; }
  public void setUserName(String value) { userName = value; }
  public String getNickName() { return nickName; }
  public void setNickName(String value) { nickName = value; }
  public String getAvatar() { return avatar; }
  public void setAvatar(String value) { avatar = value; }
  public String getReplyToName() { return replyToName; }
  public void setReplyToName(String value) { replyToName = value; }
  public String getContent() { return content; }
  public void setContent(String value) { content = value; }
  public Date getCreateTime() { return createTime; }
  public void setCreateTime(Date value) { createTime = value; }
}
