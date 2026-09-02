package com.ruoyi.shop.domain;

import java.util.Date;
import java.util.List;

public class ShopZhenkePostComment {
  private Long commentId, postId, parentCommentId, replyToCommentId, replyToShopUserId, shopUserId;
  private String userName, nickName, avatar, replyToName, content;
  private Boolean postAuthor;
  private Date createTime;
  private Long replyCount;
  private List<ShopZhenkePostComment> replies;

  public Long getCommentId() {
    return commentId;
  }

  public void setCommentId(Long v) {
    commentId = v;
  }

  public Long getPostId() {
    return postId;
  }

  public void setPostId(Long v) {
    postId = v;
  }

  public Long getParentCommentId() {
    return parentCommentId;
  }

  public void setParentCommentId(Long v) {
    parentCommentId = v;
  }

  public Long getReplyToCommentId() {
    return replyToCommentId;
  }

  public void setReplyToCommentId(Long v) {
    replyToCommentId = v;
  }

  public Long getReplyToShopUserId() {
    return replyToShopUserId;
  }

  public void setReplyToShopUserId(Long v) {
    replyToShopUserId = v;
  }

  public Long getShopUserId() {
    return shopUserId;
  }

  public void setShopUserId(Long v) {
    shopUserId = v;
  }

  public String getUserName() {
    return userName;
  }

  public void setUserName(String v) {
    userName = v;
  }

  public String getNickName() {
    return nickName;
  }

  public void setNickName(String v) {
    nickName = v;
  }

  public String getAvatar() {
    return avatar;
  }

  public void setAvatar(String v) {
    avatar = v;
  }

  public String getReplyToName() {
    return replyToName;
  }

  public void setReplyToName(String v) {
    replyToName = v;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String v) {
    content = v;
  }

  public Boolean getPostAuthor() {
    return postAuthor;
  }

  public void setPostAuthor(Boolean v) {
    postAuthor = v;
  }

  public Date getCreateTime() {
    return createTime;
  }

  public void setCreateTime(Date v) {
    createTime = v;
  }

  public Long getReplyCount() {
    return replyCount;
  }

  public void setReplyCount(Long v) {
    replyCount = v;
  }

  public List<ShopZhenkePostComment> getReplies() {
    return replies;
  }

  public void setReplies(List<ShopZhenkePostComment> v) {
    replies = v;
  }
}
