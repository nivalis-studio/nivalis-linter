import {globby} from 'globby';

export const getFilesToLint =  async (patterns: string[]) => {
 return await globby(patterns, {
  gitignore: true,
  absolute: true,
  expandDirectories: {
    extensions: ['js', 'jsx', 'ts', 'tsx'],
  },
});
};
