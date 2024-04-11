@echo off
SETLOCAL
SETLOCAL ENABLEDELAYEDEXPANSION

<% _.each( drivers, function( driver ){ %>
  
    CMD /C dpinst_<%= osArch %>_eng.exe /SE /SW /SA /PATH %~dp0\<%= driver %>
  
<% }); %>