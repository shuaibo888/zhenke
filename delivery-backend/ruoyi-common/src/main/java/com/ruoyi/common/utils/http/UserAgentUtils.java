package com.ruoyi.common.utils.http;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.ruoyi.common.utils.StringUtils;

/**
 * UserAgent解析工具类
 * 
 * @author ruoyi
 */
public class UserAgentUtils
{
    public static final String UNKNOWN = "";

    // 浏览器正则表达式模式
    private static final Pattern CHROME_PATTERN = Pattern.compile("(?:Chrome|CriOS)/(\\d+)(?:\\.\\d+)*");
    private static final Pattern FIREFOX_PATTERN = Pattern.compile("(?:Firefox|FxiOS)/(\\d+)(?:\\.\\d+)*");
    private static final Pattern EDGE_PATTERN = Pattern.compile("Edg(?:e)?/(\\d+)(?:\\.\\d+)*");
    private static final Pattern SAFARI_PATTERN = Pattern.compile("Version/(\\d+)(?:\\.\\d+)*");
    private static final Pattern OPERA_PATTERN = Pattern.compile("(?:Opera|OPR)/(\\d+)(?:\\.\\d+)*");
    private static final Pattern IE_PATTERN = Pattern.compile("(?:MSIE |Trident/.*rv:)(\\d+)(?:\\.\\d+)*");
    private static final Pattern SAMSUNG_PATTERN = Pattern.compile("SamsungBrowser/(\\d+)(?:\\.\\d+)*");
    private static final Pattern UC_PATTERN = Pattern.compile("UCBrowser/(\\d+)(?:\\.\\d+)*");
    private static final Pattern QQ_PATTERN = Pattern.compile("QQBrowser/(\\d+)(?:\\.\\d+)*");
    private static final Pattern WECHAT_PATTERN = Pattern.compile("MicroMessenger/(\\d+)(?:\\.\\d+)*");
    private static final Pattern BAIDU_PATTERN = Pattern.compile("baidubrowser/(\\d+)(?:\\.\\d+)*");

    // 操作系统正则表达式模式
    private static final Pattern WINDOWS_PATTERN = Pattern.compile("Windows NT (\\d+\\.\\d+)");
    private static final Pattern MACOS_PATTERN = Pattern.compile("Mac OS X (\\d+[_\\d]*)");
    private static final Pattern ANDROID_PATTERN = Pattern.compile("Android (\\d+)(?:\\.\\d+)*");
    private static final Pattern IOS_PATTERN = Pattern.compile("OS[\\s_](\\d+)(?:_\\d+)*");
    private static final Pattern LINUX_PATTERN = Pattern.compile("Linux");
    private static final Pattern CHROMEOS_PATTERN = Pattern.compile("CrOS");

    /**
     * 获取客户端浏览器
     */
    public static String getBrowser(String userAgent)
    {
        return formatBrowser(StringUtils.nvl(userAgent, StringUtils.EMPTY));
    }

    /**
     * 获取客户端操作系统
     */
    public static String getOperatingSystem(String userAgent)
    {
        return formatOperatingSystem(StringUtils.nvl(userAgent, StringUtils.EMPTY));
    }

    /**
     * 全面浏览器检测
     */
    private static String formatBrowser(String browser)
    {
        // Edge浏览器
        Matcher edgeMatcher = EDGE_PATTERN.matcher(browser);
        if (edgeMatcher.find())
        {
            return "Edge " + edgeMatcher.group(1);
        }
        // 微信内置浏览器
        Matcher wechatMatcher = WECHAT_PATTERN.matcher(browser);
        if (wechatMatcher.find())
        {
            return "WeChat " + wechatMatcher.group(1);
        }
        // UC浏览器
        Matcher ucMatcher = UC_PATTERN.matcher(browser);
        if (ucMatcher.find())
        {
            return "UC Browser " + ucMatcher.group(1);
        }
        // QQ浏览器
        Matcher qqMatcher = QQ_PATTERN.matcher(browser);
        if (qqMatcher.find())
        {
            return "QQ Browser " + qqMatcher.group(1);
        }
        // 百度浏览器
        Matcher baiduMatcher = BAIDU_PATTERN.matcher(browser);
        if (baiduMatcher.find())
        {
            return "Baidu Browser " + baiduMatcher.group(1);
        }
        // Samsung浏览器
        Matcher samsungMatcher = SAMSUNG_PATTERN.matcher(browser);
        if (samsungMatcher.find())
        {
            return "Samsung Browser " + samsungMatcher.group(1);
        }
        // Opera浏览器
        Matcher operaMatcher = OPERA_PATTERN.matcher(browser);
        if (operaMatcher.find())
        {
            return "Opera " + operaMatcher.group(1);
        }
        // Firefox
        Matcher firefoxMatcher = FIREFOX_PATTERN.matcher(browser);
        if (firefoxMatcher.find())
        {
            return "Firefox " + firefoxMatcher.group(1);
        }
        // Chrome系列浏览器（需放在Edge、Opera等判断之后）
        Matcher chromeMatcher = CHROME_PATTERN.matcher(browser);
        if (chromeMatcher.find())
        {
            return "Chrome " + chromeMatcher.group(1);
        }
        // Safari浏览器
        Matcher safariMatcher = SAFARI_PATTERN.matcher(browser);
        if (safariMatcher.find() && browser.contains("Safari"))
        {
            return "Safari " + safariMatcher.group(1);
        }
        // IE浏览器
        Matcher ieMatcher = IE_PATTERN.matcher(browser);
        if (ieMatcher.find())
        {
            return "Internet Explorer " + ieMatcher.group(1);
        }
        return UNKNOWN;
    }

    /**
     * 检测操作系统
     */
    private static String formatOperatingSystem(String operatingSystem)
    {
        // Windows系统
        Matcher windowsMatcher = WINDOWS_PATTERN.matcher(operatingSystem);
        if (windowsMatcher.find())
        {
            return "Windows " + getWindowsVersionDisplay(windowsMatcher.group(1));
        }
        // Android系统
        Matcher androidMatcher = ANDROID_PATTERN.matcher(operatingSystem);
        if (androidMatcher.find())
        {
            return "Android " + extractMajorVersion(androidMatcher.group(1));
        }
        // iOS系统
        Matcher iosMatcher = IOS_PATTERN.matcher(operatingSystem);
        if (iosMatcher.find() && (operatingSystem.contains("iPhone") || operatingSystem.contains("iPad")))
        {
            return "iOS " + extractMajorVersion(iosMatcher.group(1));
        }
        // Chrome OS（需放在Linux判断之前）
        if (CHROMEOS_PATTERN.matcher(operatingSystem).find())
        {
            return "Chrome OS";
        }
        // macOS系统（需放在iOS判断之后）
        Matcher macMatcher = MACOS_PATTERN.matcher(operatingSystem);
        if (macMatcher.find())
        {
            String version = macMatcher.group(1).replace("_", ".");
            return "macOS " + extractMajorVersion(version);
        }
        // Linux系统
        if (LINUX_PATTERN.matcher(operatingSystem).find() && !operatingSystem.contains("Android"))
        {
            return "Linux";
        }
        return UNKNOWN;
    }

    /**
     * 提取优化的主版本号
     */
    private static String extractMajorVersion(String fullVersion)
    {
        if (StringUtils.isEmpty(fullVersion))
        {
            return StringUtils.EMPTY;
        }
        try
        {
            // 清理版本号中的非数字字符
            String cleanVersion = fullVersion.replaceAll("[^0-9.]", "");
            String[] parts = cleanVersion.split("\\.");
            if (parts.length > 0)
            {
                String firstPart = parts[0];
                if (firstPart.matches("\\d+"))
                {
                    int version = Integer.parseInt(firstPart);

                    return String.valueOf(version);
                }
            }
        }
        catch (NumberFormatException e)
        {
            // 版本号解析失败，返回原始值
        }
        return fullVersion;
    }

    /**
     * Windows版本号显示优化
     */
    private static String getWindowsVersionDisplay(String version)
    {
        switch (version)
        {
            case "10.0":
                return "10";
            case "6.3":
                return "8.1";
            case "6.2":
                return "8";
            case "6.1":
                return "7";
            case "6.0":
                return "Vista";
            case "5.1":
                return "XP";
            case "5.0":
                return "2000";
            default:
                return extractMajorVersion(version);
        }
    }
}
