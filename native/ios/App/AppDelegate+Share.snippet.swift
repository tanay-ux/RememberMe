/*
  Merge into ios/App/App/AppDelegate.swift after `npx cap add ios`.

  1. Enable App Groups on the App target: group.com.rememberme.app
  2. Copy PendingShareHandoff.swift into the App target
  3. Add the hooks below

  applicationDidBecomeActive:

    PendingShareHandoff.openIfNeeded()

  Or in scene activation (iOS 13+ SceneDelegate):

    PendingShareHandoff.openIfNeeded()
*/
