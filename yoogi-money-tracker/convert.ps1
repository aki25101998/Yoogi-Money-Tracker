Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Users\aki25\.gemini\antigravity-ide\brain\0be6bf9e-b65e-468b-b8f2-906617ca9f05\media__1781711792604.jpg')
mkdir -Force assets
$img.Save('assets\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$img.Save('assets\logo.png', [System.Drawing.Imaging.ImageFormat]::Png)
Copy-Item 'C:\Users\aki25\.gemini\antigravity-ide\brain\0be6bf9e-b65e-468b-b8f2-906617ca9f05\media__1781711792604.jpg' -Destination 'public\logo.jpg' -Force
