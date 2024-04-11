"use strict";
describe.skip('Incremental import of Refresh DB', () => {
    describe('Package modified in refresh DB', () => {
        it('should replace the dev* group if the resources/overviews of any dev* package were modified');
        it('should do a full import if the dev* definitions of any dev* package were modified');
        it('should replace the s/w group if resources/overviews of its main package was modified');
        it('should replace the s/w group if all resources of its main package were deleted');
        it('should replace the s/w group if resources/overviews of any of its supplemental packages were modified');
    });
    describe('Package deleted from refresh DB', () => {
        it('should do a full import if a dev package was deleted');
        it('should unpublish a s/w group if its main package was deleted');
        it('should replace a sw group if any of its supplemental packages was deleted');
    });
    describe('Package added to refresh DB', () => {
        it('should do a full import if a dev* package was added');
        it('should replace a s/w group for an existing main package that has a newly added supplemental package');
        it('should import a new s/w group for an added main package');
        it('should import a new s/w group for an added main package with supplemental package');
        it('should replace s/w groups of each of the main packages if one supplemental package was added that supplements all these main packages ');
        it('should import a new s/w group for a newly added main package that references an existing supplemental package'); // use chinese academy and 2 versions of the sdk
    });
    describe('Combinations', () => {
        specify('delete a supplemental package, delete a main package, modify a main package');
        it('should unpublish one group and replace the other group');
        // A supplemental package is contributed to two main packages.
        // The supplemental package and one main package is deleted.
    });
    describe('Other cases', () => {
        it('should not import identical DB folders');
        it('should do a full import if the previous DB folder does not exist');
    });
});
