"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.theme = exports.zIndexLevel = exports.LARGE_ICON_SIZE = exports.REGULAR_ICON_SIZE = exports.SMALL_ICON_SIZE = void 0;
// 3rd party
const React = require("react");
const material_ui_imports_1 = require("../imports/material-ui-imports");
// our Components
const styled_icons_1 = require("../components/styled-icons");
const util_1 = require("./util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
exports.SMALL_ICON_SIZE = '18px';
exports.REGULAR_ICON_SIZE = '18px';
exports.LARGE_ICON_SIZE = '24px';
const PRIMARY_COLOR = {
    light: '#cc0000',
    main: '#cc0000',
    dark: '#990000'
};
const SECONDARY_COLOR = {
    light: '#3492CA',
    main: '#0277BD',
    dark: '#015384'
};
const PRIMARY_DARK_COLOR = {
    light: '#d9f1f4',
    main: '#3794ff',
    dark: '#217daf'
};
const SECONDARY_DARK_COLOR = {
    light: '#eeeeee',
    main: '#999999',
    dark: '#555555'
};
const GREY_COLOR = {
    100: material_ui_imports_1.grey[100],
    300: material_ui_imports_1.grey[300],
    800: material_ui_imports_1.grey[800]
};
const ERROR_COLOR = {
    main: material_ui_imports_1.red[500]
};
const SUCCESS_COLOR = {
    light: '#66BB6A',
    main: '#66BB6A',
    dark: '#66BB6A'
};
const paletteOptionsLight = {
    primary: PRIMARY_COLOR,
    secondary: SECONDARY_COLOR,
    error: ERROR_COLOR,
    success: SUCCESS_COLOR,
    grey: GREY_COLOR,
    background: {
        default: '#fff',
        paper: '#ffffff'
    },
    text: {
        primary: '#424242',
        secondary: '#424242'
    },
    type: 'light'
};
const paletteOptionsDark = {
    primary: PRIMARY_DARK_COLOR,
    secondary: SECONDARY_DARK_COLOR,
    error: ERROR_COLOR,
    success: SUCCESS_COLOR,
    grey: GREY_COLOR,
    background: {
        default: '#1e1e1e',
        paper: '#252526'
    },
    text: {
        primary: '#ccc',
        secondary: '#ccc'
    },
    type: 'dark'
};
const muiZIndexOptions = {
    // MUI defaults
    mobileStepper: 1000,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    // Overrides
    tooltip: util_1.HIGHEST_SAFE_NUMBER
};
exports.zIndexLevel = {
    ...muiZIndexOptions,
    min: 1,
    levelOne: 1000,
    levelTwo: util_1.HIGHEST_SAFE_NUMBER - 3,
    levelThree: util_1.HIGHEST_SAFE_NUMBER - 2,
    levelFour: util_1.HIGHEST_SAFE_NUMBER - 1,
    max: util_1.HIGHEST_SAFE_NUMBER
};
const theme = (type) => {
    const paletteOptions = type === 'dark' ? paletteOptionsDark : paletteOptionsLight;
    return (0, material_ui_imports_1.createTheme)({
        typography: {
            // remove letter spacing because the new knerning is messed up for some fonts
            // See https://github.com/mui-org/material-ui/issues/12741#issuecomment-429679772
            allVariants: {
                letterSpacing: 0
            }
        },
        overrides: {
            MuiCssBaseline: {
                '@global': {
                    '*::-webkit-scrollbar': {
                        width: '10px',
                        height: '10px'
                    },
                    '*::-webkit-scrollbar-track': {
                        '-webkit-box-shadow': 'inset 0 0 6px rgba(0,0,0,0.00)'
                    },
                    '*::-webkit-scrollbar-thumb': {
                        backgroundColor: type === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(191, 191, 191, 0.2)'
                    },
                    '*::-webkit-scrollbar-thumb:hover': {
                        backgroundColor: 'rgba(100, 100, 100, 0.7)'
                    }
                }
            },
            MuiButton: {
                root: {
                    '&:enabled': {
                        ...(type === 'light' ? { color: paletteOptions.secondary.main } : {})
                    }
                }
            },
            MuiCardContent: {
                root: {
                    padding: 0,
                    '&:last-child': {
                        paddingBottom: 0
                    }
                }
            },
            MuiCheckbox: {
                root: {
                    height: '24px'
                }
            },
            MuiChip: {
                deleteIcon: {
                    height: 'inherit',
                    ...(type === 'light'
                        ? { color: paletteOptions.grey[800] }
                        : { color: paletteOptions.text.primary })
                }
            },
            MuiFormLabel: {
                root: type === 'light'
                    ? {
                        color: paletteOptions.grey[800],
                        '&$focused': {
                            color: paletteOptions.grey[800]
                        }
                    }
                    : {}
            },
            MuiIconButton: {
                root: {
                    width: '32px',
                    height: '32px',
                    padding: '0px'
                }
            },
            MuiInputBase: {
                root: {
                    ...(type === 'dark' ? { backgroundColor: '#333' } : {})
                }
            },
            MuiListItem: {
                root: {
                    backgroundColor: paletteOptions.background.paper
                }
            },
            MuiTypography: {
                root: {
                    color: paletteOptions.text.primary
                }
            },
            MuiMobileStepper: {
                dotActive: {
                    backgroundColor: paletteOptions.secondary.main
                }
            },
            MuiRadio: {
                root: {
                    margin: '0px',
                    padding: '0px'
                }
            },
            MuiSvgIcon: {
                root: {
                    fontSize: exports.REGULAR_ICON_SIZE,
                    color: type === 'light' ? 'inherit' : paletteOptions.secondary.main
                }
            },
            MuiTable: {
                root: {
                    backgroundColor: paletteOptions.background.paper
                }
            },
            MuiTableCell: {
                root: {
                    whiteSpace: 'nowrap'
                }
            }
        },
        palette: paletteOptions,
        props: {
            MuiButton: {
                size: 'small'
            },
            MuiButtonBase: {
                disableRipple: true
            },
            MuiCheckbox: {
                color: 'secondary'
            },
            MuiChip: {
                deleteIcon: (React.createElement(material_ui_imports_1.IconButton, null,
                    React.createElement(styled_icons_1.CloseSmall, null)))
            },
            MuiDialog: {
                disableEscapeKeyDown: true,
                maxWidth: 'lg',
                scroll: 'paper'
            },
            MuiList: {
                dense: true,
                disablePadding: true
            },
            MuiListItem: {
                button: true
            },
            MuiListItemText: {
                primaryTypographyProps: {
                    variant: 'body2'
                }
            },
            MuiListSubheader: {
                disableSticky: true
            },
            MuiMenuItem: {
                dense: true
            },
            MuiRadio: {},
            MuiTable: {
                size: 'small'
            },
            MuiTooltip: {
                enterDelay: 200,
                disableFocusListener: true
            }
        },
        zIndex: muiZIndexOptions
    });
};
exports.theme = theme;
