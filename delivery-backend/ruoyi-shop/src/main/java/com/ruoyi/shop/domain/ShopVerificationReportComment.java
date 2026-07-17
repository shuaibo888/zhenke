package com.ruoyi.shop.domain;

import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ShopVerificationReportComment
{
    private Long commentId;
    private Long reportId;
    private Long parentCommentId;
    private Long replyToCommentId;
    private Long shopUserId;
    private String userName;
    private String nickName;
    private String avatar;
    private String replyToUserName;
    private String replyToNickName;
    private String content;
    private String delFlag;
    private Date createTime;
    private Date updateTime;
    private List<ShopVerificationReportComment> replies;

    public Long getCommentId() { return commentId; }
    public void setCommentId(Long commentId) { this.commentId = commentId; }
    public Long getReportId() { return reportId; }
    public void setReportId(Long reportId) { this.reportId = reportId; }
    public Long getParentCommentId() { return parentCommentId; }
    public void setParentCommentId(Long parentCommentId) { this.parentCommentId = parentCommentId; }
    public Long getReplyToCommentId() { return replyToCommentId; }
    public void setReplyToCommentId(Long replyToCommentId) { this.replyToCommentId = replyToCommentId; }
    public Long getShopUserId() { return shopUserId; }
    public void setShopUserId(Long shopUserId) { this.shopUserId = shopUserId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getNickName() { return nickName; }
    public void setNickName(String nickName) { this.nickName = nickName; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public String getReplyToUserName() { return replyToUserName; }
    public void setReplyToUserName(String replyToUserName) { this.replyToUserName = replyToUserName; }
    public String getReplyToNickName() { return replyToNickName; }
    public void setReplyToNickName(String replyToNickName) { this.replyToNickName = replyToNickName; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getUpdateTime() { return updateTime; }
    public void setUpdateTime(Date updateTime) { this.updateTime = updateTime; }
    public List<ShopVerificationReportComment> getReplies() { return replies; }
    public void setReplies(List<ShopVerificationReportComment> replies) { this.replies = replies; }
}
