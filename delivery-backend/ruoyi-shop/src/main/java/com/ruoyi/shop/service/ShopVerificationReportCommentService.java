package com.ruoyi.shop.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.ShopVerificationReportComment;
import com.ruoyi.shop.domain.dto.ShopReportCommentBody;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.mapper.ShopVerificationReportCommentMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopVerificationReportCommentService
{
    private final ShopVerificationReportCommentMapper commentMapper;
    private final ShopTrialMapper trialMapper;

    public ShopVerificationReportCommentService(ShopVerificationReportCommentMapper commentMapper,
            ShopTrialMapper trialMapper)
    {
        this.commentMapper = commentMapper;
        this.trialMapper = trialMapper;
    }

    public List<ShopVerificationReportComment> comments(long reportId)
    {
        requirePublishedReport(reportId);
        List<ShopVerificationReportComment> rows = commentMapper.selectActiveComments(reportId);
        Map<Long, ShopVerificationReportComment> roots = new LinkedHashMap<>();
        for (ShopVerificationReportComment row : rows)
        {
            if (row.getParentCommentId() == null)
            {
                row.setReplies(new ArrayList<>());
                roots.put(row.getCommentId(), row);
            }
        }
        for (ShopVerificationReportComment row : rows)
        {
            if (row.getParentCommentId() != null)
            {
                ShopVerificationReportComment root = roots.get(row.getParentCommentId());
                if (root != null)
                {
                    row.setReplies(List.of());
                    root.getReplies().add(row);
                }
            }
        }
        return new ArrayList<>(roots.values());
    }

    @Transactional
    public ShopVerificationReportComment create(long reportId, ShopReportCommentBody body)
    {
        requirePublishedReport(reportId);
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        Long parentCommentId = null;
        Long replyToCommentId = body.getReplyToCommentId();
        if (replyToCommentId != null)
        {
            ShopVerificationReportComment target = requireActiveComment(reportId, replyToCommentId);
            Long rootCommentId = target.getParentCommentId() == null
                    ? target.getCommentId() : target.getParentCommentId();
            if (commentMapper.selectActiveRootForUpdate(reportId, rootCommentId) == null)
            {
                throw new ServiceException("原评论已删除，请刷新后重试");
            }
            target = requireActiveComment(reportId, replyToCommentId);
            if (target.getParentCommentId() != null && !rootCommentId.equals(target.getParentCommentId()))
            {
                throw new ServiceException("回复关系无效");
            }
            parentCommentId = rootCommentId;
        }

        ShopVerificationReportComment comment = new ShopVerificationReportComment();
        comment.setReportId(reportId);
        comment.setParentCommentId(parentCommentId);
        comment.setReplyToCommentId(replyToCommentId);
        comment.setShopUserId(shopUserId);
        comment.setContent(StringUtils.trim(body.getContent()));
        commentMapper.insertComment(comment);
        return requireActiveComment(reportId, comment.getCommentId());
    }

    @Transactional
    public void delete(long reportId, long commentId)
    {
        requirePublishedReport(reportId);
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        ShopVerificationReportComment candidate = requireActiveComment(reportId, commentId);
        Long rootCommentId = candidate.getParentCommentId() == null
                ? candidate.getCommentId() : candidate.getParentCommentId();
        if (commentMapper.selectActiveRootForUpdate(reportId, rootCommentId) == null)
        {
            throw new ServiceException("评论已删除");
        }
        ShopVerificationReportComment comment = requireActiveComment(reportId, commentId);
        if (!Long.valueOf(shopUserId).equals(comment.getShopUserId()))
        {
            throw new ServiceException("只能删除自己发布的评论");
        }
        int affected = comment.getParentCommentId() == null
                ? commentMapper.softDeleteCommentTree(reportId, commentId, shopUserId)
                : commentMapper.softDeleteComment(reportId, commentId, shopUserId);
        if (affected == 0)
        {
            throw new ServiceException("评论已删除，请刷新后重试");
        }
    }

    private ShopVerificationReport requirePublishedReport(long reportId)
    {
        ShopVerificationReport report = trialMapper.selectReportById(reportId);
        if (report == null || !"PUBLISHED".equals(report.getStatus()))
        {
            throw new ServiceException("验证报告不存在");
        }
        return report;
    }

    private ShopVerificationReportComment requireActiveComment(long reportId, long commentId)
    {
        ShopVerificationReportComment comment = commentMapper.selectActiveComment(reportId, commentId);
        if (comment == null)
        {
            throw new ServiceException("评论不存在或已删除");
        }
        return comment;
    }
}
