$lines = Get-Content 'web-application\src\App.jsx'
for ($i = 2441; $i -le 2460; $i++) {
    '{0}: {1}' -f ($i + 1), $lines[$i]
}
