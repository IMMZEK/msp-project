"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stylesCommon = void 0;
// IE11 has a browser bug when using flexbox.
// Extra vertical scrollbar appears when the container has a horizontal scrollbar
// Read: https://stackoverflow.com/questions/45887710/ie-and-edge-flexbox-bug/45893077#45893077
function stylesCommon(theme) {
    return {
        flexItem: {
            flex: '1 1 auto'
        },
        flexItemNoShrink: {
            flex: '1 0 auto'
        },
        horizontalFlexContainer: {
            display: 'flex',
            flexFlow: 'row',
            // Allows flex items to shrink to fit inside their container
            minWidth: '0',
            minHeight: '0'
        },
        iframe: {
            position: 'relative',
            border: 'none',
            minHeight: '0px'
        },
        // Should really be rtl
        ltrFlexContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            // Allows flex items to shrink to fit inside their container
            minWidth: '0',
            minHeight: '0'
        },
        noFlex: {
            flex: '0 0 auto'
        },
        reverseColumnFlexContainer: {
            display: 'flex',
            flexFlow: 'column-reverse'
        },
        textFieldContainer: {
            backgroundColor: theme.palette.background.default
        },
        verticalFlexContainer: {
            display: 'flex',
            flexFlow: 'column',
            // Allows flex items to shrink to fit inside their container
            minHeight: '0',
            minWidth: '0'
        },
        verticalFlexContainerNoMin: {
            // Should re-evaluate if those mins are still needed
            display: 'flex',
            flexFlow: 'column'
        },
        verticallyCenteredFlexContainer: {
            alignItems: 'center'
        }
    };
}
exports.stylesCommon = stylesCommon;
