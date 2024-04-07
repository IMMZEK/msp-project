/**
 * Workaround to allow importing from one location while not increasing bundle size.
 * Once tree shaking support is improved we can import from @material-ui/styles directly
 */
export { makeStyles, createStyles, withStyles, WithStyles, CSSProperties } from '@material-ui/styles';
