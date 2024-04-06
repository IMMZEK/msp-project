VASA (Voice-Activated Smart Assistant)

## Boards and Boosters used
- TI LAUNCHXL-F28379D

## C2000WARE (SDK)
Used:  Version: 5.01.00.00 Release date: 20 Nov 2023 
(C2000WARE SDK LINK)[https://www.ti.com/tool/C2000WARE#downloads]

### i386
<details><summary>Arch</summary>

1. Enable multilib, but editing `/etc/pacman.conf`
```
[multilib]
Include = /etc/pacman.d/mirrorlist
```

2. Update package database and upgrade system
```
sudo pacman -Syu
```

3. Install 32-bit libraries
```
sudo pacman -S lib32-glibc lib32-ncurses lib32-gcc-libs
```
</details>

<details><summary>Debian</summary>

1. Enable multilib
```
sudo dpkg --add-architecture i386
```

2. Update package databse
```
sudo apt-get update
```

3. Install 32-bit libraries
```
sudo apt-get install libc6:i386 libncurses5:i386 libstdc++6:i386
```

</details>

4. Check for executable permissions
```
chmod +x C2000Ware_5_01_00_00_setup.run
```

5. Use `ldd` for missing dependencies
```
ldd C2000Ware_5_01_00_00_setup.run
```

6. Run the script
I installed this to /home/brighton/Documents/SDK/ti/f28379d
```
./C2000Ware_5_01_00_00_setup.run
```

7. Link to env (in .bashrc)
```
export F28379D_HEADERS=/path/to/headers/
# for example
export F28379D_HEADERS=/home/brighton/Documents/SDK/ti/f28379d/C2000Ware_5_01_00_00/
```

8. Source env
```
source ~/.bashrc
```


## C2000 Academy
(C2000 Academy Link)[https://dev.ti.com/tirex/explore/node?node=A__AEIJm0rwIeU.2P1OBWwlaA__C2000-ACADEMY__3H1LnqB__LATEST]


