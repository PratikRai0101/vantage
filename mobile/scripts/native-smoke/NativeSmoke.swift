import XCTest

final class NativeSmoke: XCTestCase {
  func shot(_ name: String) {
    let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    a.name = name; a.lifetime = .keepAlways; add(a)
  }
  func replayTime(_ app: XCUIApplication) -> Double {
    let labels = app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "^[0-9]{2}:[0-9]{2}(\\.[0-9])?$")).allElementsBoundByIndex.map { $0.label }
    let values = labels.compactMap { label -> Double? in
      let parts = label.split(separator: ":")
      guard parts.count == 2, let minutes = Double(parts[0]), let seconds = Double(parts[1]) else { return nil }
      return minutes * 60 + seconds
    }
    return values.first(where: { $0 < 120 }) ?? .nan
  }
  func testNativeReplay() throws {
    continueAfterFailure = false
    let app = XCUIApplication(bundleIdentifier: "dev.vantage.spectator")
    app.activate()
    let spring = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    for _ in 0..<8 {
      if spring.alerts.buttons["Open"].waitForExistence(timeout: 1) { spring.alerts.buttons["Open"].firstMatch.tap() }
      else if app.alerts.buttons["Open"].exists { app.alerts.buttons["Open"].firstMatch.tap() }
      else { break }
    }
    let race = app.tabBars.buttons["Race"]
    XCTAssertTrue(race.waitForExistence(timeout: 10)); race.tap()
    if app.buttons["Pause replay"].exists { app.buttons["Pause replay"].tap() }
    XCTAssertTrue(app.staticTexts["Loading native circuit…"].waitForNonExistence(timeout: 30))
    XCTAssertTrue(app.buttons["Follow"].waitForExistence(timeout: 10)); app.buttons["Follow"].tap()
    XCTAssertTrue(app.buttons["Follow"].isSelected)
    sleep(2); shot("native-follow")
    app.buttons["Battle"].tap(); sleep(2); shot("native-battle")
    app.buttons["All cars"].tap(); sleep(2); shot("native-overview")
    let before = replayTime(app)
    XCTAssertTrue(before.isFinite)
    app.buttons["Play replay"].tap(); sleep(2); shot("native-playing-a")
    sleep(2); shot("native-playing-b")
    XCTAssertGreaterThan(replayTime(app), before + 1, "UI replay clock must actually advance")
    app.buttons["Pause replay"].tap()
    XCTAssertTrue(app.buttons["Play replay"].waitForExistence(timeout: 5))
    let paused = replayTime(app)
    app.tabBars.buttons["Timing"].tap(); sleep(1)
    XCTAssertTrue(app.staticTexts["Timing"].firstMatch.exists)
    XCTAssertEqual(replayTime(app), paused, accuracy: 0.2)
    shot("native-timing")
    app.tabBars.buttons["Lab"].tap(); sleep(1)
    XCTAssertTrue(app.staticTexts["Telemetry"].waitForExistence(timeout: 5))
    XCTAssertEqual(replayTime(app), paused, accuracy: 0.2)
    shot("native-lab")
    app.tabBars.buttons["Race"].tap()
    XCTAssertTrue(app.staticTexts["Loading native circuit…"].waitForNonExistence(timeout: 30))
    app.buttons["Follow"].tap(); sleep(2); shot("native-follow-after-tabs")
    XCTAssertFalse(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Native 3D unavailable")).firstMatch.exists)
  }
}
