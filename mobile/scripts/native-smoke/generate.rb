require 'xcodeproj'
require 'fileutils'
out = ARGV.fetch(0)
FileUtils.mkdir_p(out)
project = Xcodeproj::Project.new(File.join(out, 'NativeSmoke.xcodeproj'))
target = project.new_target(:ui_test_bundle, 'NativeSmoke', :ios, '18.0')
source = project.main_group.new_file(ARGV[1] ? File.expand_path(ARGV[1]) : File.expand_path('NativeSmoke.swift', __dir__))
target.source_build_phase.add_file_reference(source)
target.build_configurations.each do |c|
  c.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'dev.vantage.smokeui'
  c.build_settings['SWIFT_VERSION'] = '5.0'
  c.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  c.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
  c.build_settings['TARGETED_DEVICE_FAMILY'] = '1'
end
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.add_test_target(target)
scheme.test_action.build_configuration = 'Debug'
scheme.save_as(project.path, 'NativeSmoke', true)
project.save
puts project.path
