package com.jiwuchat.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : TauriActivity() {

  private val requestPermissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
      permissions.entries.forEach { entry ->
        val permissionName = entry.key
        val isGranted = entry.value
      }
    }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    // 字体不可缩放
    webView.settings.textZoom = 100;
    webView.settings.saveFormData = false;
    webView.settings.savePassword = false;
    // 清除表单数据
    webView.clearFormData()
  }

  @SuppressLint("SourceLockedOrientationActivity")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main);
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    // 请求权限
    requestPermissions()
  }

  private fun requestPermissions() {
    requestPermissionLauncher.launch(
      arrayOf(
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.CAMERA,
        Manifest.permission.WRITE_EXTERNAL_STORAGE,
        Manifest.permission.READ_EXTERNAL_STORAGE,
        Manifest.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
        Manifest.permission.FOREGROUND_SERVICE
      )
    )
  }
}
