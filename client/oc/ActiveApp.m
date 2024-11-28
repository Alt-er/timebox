#import <Cocoa/Cocoa.h>

// 修改结构体，使用 const char* 而不是 NSString*
typedef struct {
    const char* appName;
    const char* windowTitle;
} ActiveAppInfo;

ActiveAppInfo getActiveAppInfo() {
    ActiveAppInfo info = {.appName = NULL, .windowTitle = NULL};
    
    @autoreleasepool {
        // 获取当前活动应用
        NSRunningApplication *activeApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
        NSString *appNameStr = [activeApp localizedName];
        
        // 获取窗口信息
        CFArrayRef windowList = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
        NSString *windowTitleStr = @"";
        
        if (windowList) {
            NSArray *windows = CFBridgingRelease(windowList);
            for (NSDictionary *window in windows) {
                NSNumber *pid = window[(NSString *)kCGWindowOwnerPID];
                NSString *title = window[(NSString *)kCGWindowName];
                
                if ([pid intValue] == [activeApp processIdentifier] && title.length > 0) {
                    windowTitleStr = title;
                    break;
                }
            }
        }
        
        // 使用 strdup 复制字符串
        info.appName = strdup([appNameStr UTF8String]);
        info.windowTitle = strdup([windowTitleStr UTF8String]);
    }
    
    return info;
}
