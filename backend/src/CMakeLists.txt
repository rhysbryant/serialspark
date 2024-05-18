# This file was automatically generated for projects
# without default 'CMakeLists.txt' file.

FILE(GLOB_RECURSE app_sources ${CMAKE_SOURCE_DIR}/src/*.*)

idf_component_register(SRCS ${app_sources} REQUIRES "esp_https_server" "simpleHttpServer") 
set(EXTRA_COMPONENT_DIRS components components/esp-wolfssl)
