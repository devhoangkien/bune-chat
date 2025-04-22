// tray.rs
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
}

const HOST_URL: &str = "https://jiwuchat.kiwi233.top";
// msgbox宽高
// const MSGBOX_WIDTH: f64 = 240.0;
// const MSGBOX_HEIGHT: f64 = 300.0;

pub fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let setting = MenuItemBuilder::with_id("setting", "设置").build(app)?;
    let to_host = MenuItemBuilder::with_id("to_host", "官网").build(app)?;
    let restart = MenuItemBuilder::with_id("restart", "重启").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&restart, &setting, &to_host, &quit])
        .build()?;

    TrayIconBuilder::with_id("tray_icon")
        .menu(&menu)
        .icon(app.default_window_icon().unwrap().clone())
        .title("极物聊天")
        .tooltip("极物聊天")
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "setting" => {
                if let Some(window) = app.get_webview_window("main") {
                    window.unminimize().unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                    window
                        .emit(
                            "router",
                            Payload {
                                message: "/setting".into(),
                            },
                        )
                        .unwrap();
                }
            }
            "to_host" => {
                if let Some(window) = app.get_webview_window("main") {
                    window
                        .emit(
                            "open_url",
                            Payload {
                                message: HOST_URL.into(),
                            },
                        )
                        .unwrap();
                } else {
                    println!("Window 'main' does not exist!");
                }
            }
            "quit" => {
                app.clone()
                    .save_window_state(StateFlags::all())
                    .unwrap_or_else(|e| eprintln!("保存窗口状态时出错: {:?}", e));
                std::process::exit(0);
            }
            "restart" => {
                app.restart();
            }
            _ => (),
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                id: _,
                rect: _,
                button,
                button_state: MouseButtonState::Up,
                ..
            } => match button {
                MouseButton::Left {} => {
                    let app = tray.app_handle();
                    if let Some(webview_window) = app.get_webview_window("main") {
                        let _ = webview_window.unminimize();
                        let _ = webview_window.show();
                        let _ = webview_window.set_focus();
                    } else {
                        show_window(&app);
                    }
                    app.emit("tray_click", ()).unwrap();
                }
                MouseButton::Right {} => {}
                _ => {}
            },
            TrayIconEvent::Enter {
                id: _,
                position,
                rect: _,
            } => {
                let app = tray.app_handle();
                app.emit("tray_mouseenter", position).unwrap();
                if let Some(msgbox) = app.get_webview_window("msgbox") {
                    msgbox.set_focus().unwrap();
                }
            }
            TrayIconEvent::Leave {
                id: _,
                position,
                rect: _,
            } => {
                let app = tray.app_handle();
                std::thread::sleep(std::time::Duration::from_millis(200));
                if let Some(webview_window) = app.get_webview_window("msgbox") {
                    if !webview_window.is_focused().unwrap() {
                        webview_window.hide().unwrap();
                    };
                }
                app.emit("tray_mouseleave", position).unwrap();
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

#[cfg(desktop)]
pub fn show_window(app: &AppHandle) {
    use crate::desktops::window::setup_desktop_window;

    if let Some(window) = app.webview_windows().get("main") {
        window
            .unminimize()
            .unwrap_or_else(|e| eprintln!("取消最小化窗口时出错: {:?}", e));
        window
            .show()
            .unwrap_or_else(|e| eprintln!("显示窗口时出错: {:?}", e));
        window
            .set_focus()
            .unwrap_or_else(|e| eprintln!("聚焦窗口时出错: {:?}", e));
    } else if let Some(window) = app.webview_windows().get("login") {
        window
            .unminimize()
            .unwrap_or_else(|e| eprintln!("取消最小化窗口时出错: {:?}", e));
        window
            .show()
            .unwrap_or_else(|e| eprintln!("显示窗口时出错: {:?}", e));
        window
            .set_focus()
            .unwrap_or_else(|e| eprintln!("聚焦窗口时出错: {:?}", e));
    } else {
        setup_desktop_window(app).unwrap_or_else(|e| eprintln!("创建窗口时出错: {:?}", e));
    }
}
