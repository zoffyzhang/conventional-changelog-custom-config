'use strict'

const compareFunc = require(`compare-func`)
const Q = require(`q`)
const readFile = Q.denodeify(require(`fs`).readFile)
const resolve = require(`path`).resolve
const path = require('path')

// 自定义配置
let pkgJson = {}
try {
  pkgJson = require(path.resolve(process.cwd(), './package.json'))
} catch (err) {
  console.error('no root package.json found')
}

const pickCommitTypeDefault = {
  feat: true,
  fix: true,
  perf: true,
  revert: true,
  docs: true,
  style: true,
  refactor: true,
  test: true,
  build: true,
  ci: true,
  chore: true
}

const { changelog } = pkgJson
const pickCommitType =
  changelog.pickCommitType && Object.keys(changelog.pickCommitType).length > 0
    ? changelog.pickCommitType
    : pickCommitTypeDefault
let bugsUrl = changelog ? changelog.bugsUrl || false : false
if (typeof bugsUrl !== 'string') bugsUrl = false
let emojis = changelog ? changelog.emojis || false : false
let authorName = changelog ? changelog.authorName || false : false
let authorEmail = changelog ? changelog.authorEmail || false : false

let gitUserInfo = ''
if (authorName && authorEmail) {
  gitUserInfo = `by: **{{authorName}}** ({{authorEmail}})`
}
if (authorName && authorEmail === false) {
  gitUserInfo = `by: **{{authorName}}**`
}
if (authorName === false && authorEmail) {
  gitUserInfo = `by: ({{authorEmail}})`
}

module.exports = Q.all([
  readFile(resolve(__dirname, `./templates/template.hbs`), `utf-8`),
  readFile(resolve(__dirname, `./templates/header.hbs`), `utf-8`),
  readFile(resolve(__dirname, `./templates/commit.hbs`), `utf-8`),
  readFile(resolve(__dirname, `./templates/footer.hbs`), `utf-8`)
]).spread((template, header, commit, footer) => {
  const writerOpts = getWriterOpts()

  writerOpts.mainTemplate = template
  writerOpts.headerPartial = header
  // 替换 commit.hbs 模板中的 gitUserInfo
  writerOpts.commitPartial = commit.replace(/{{gitUserInfo}}/g, gitUserInfo)
  writerOpts.footerPartial = footer

  return writerOpts
})

function getWriterOpts() {
  return {
    transform: (commit, context) => {
      let discard = true
      const issues = []

      commit.notes.forEach(note => {
        note.title = `BREAKING CHANGES`
        discard = false
      })

      if (emojis) {
        if (commit.type === `feat` && pickCommitType.feat) {
          commit.type = `✨ Features`
        } else if (commit.type === `fix` && pickCommitType.fix) {
          commit.type = `🐛 Bug Fixes`
        } else if (commit.type === `perf` && pickCommitType.perf) {
          commit.type = `⚡ Performance Improvements`
        } else if (commit.type === `revert` && pickCommitType.revert) {
          commit.type = `⏪ Reverts`
        } else if (commit.type === `docs` && pickCommitType.docs) {
          commit.type = `📝 Documentation`
        } else if (commit.type === `style` && pickCommitType.style) {
          commit.type = `💄 Styles`
        } else if (commit.type === `refactor` && pickCommitType.refactor) {
          commit.type = `♻ Code Refactoring`
        } else if (commit.type === `test` && pickCommitType.test) {
          commit.type = `✅ Tests`
        } else if (commit.type === `build` && pickCommitType.build) {
          commit.type = `👷‍ Build System`
        } else if (commit.type === `ci` && pickCommitType.ci) {
          commit.type = `🔧 Continuous Integration`
        } else if (commit.type === 'chore' && pickCommitType.chore) {
          commit.type = '🎫 Chores'
        } else if (discard) {
          return
        }
      } else {
        if (commit.type === `feat` && pickCommitType.feat) {
          commit.type = `Features`
        } else if (commit.type === `fix` && pickCommitType.fix) {
          commit.type = `Bug Fixes`
        } else if (commit.type === `perf` && pickCommitType.perf) {
          commit.type = `Performance Improvements`
        } else if (commit.type === `revert` && pickCommitType.revert) {
          commit.type = `Reverts`
        } else if (commit.type === `docs` && pickCommitType.docs) {
          commit.type = `Documentation`
        } else if (commit.type === `style` && pickCommitType.style) {
          commit.type = `Styles`
        } else if (commit.type === `refactor` && pickCommitType.refactor) {
          commit.type = `Code Refactoring`
        } else if (commit.type === `test` && pickCommitType.test) {
          commit.type = `Tests`
        } else if (commit.type === `build` && pickCommitType.build) {
          commit.type = `Build System`
        } else if (commit.type === `ci` && pickCommitType.ci) {
          commit.type = `Continuous Integration`
        } else if (commit.type === 'chore' && pickCommitType.chore) {
          commit.type = 'Chores'
        } else if (discard) {
          return
        }
      }

      if (commit.scope === `*`) {
        commit.scope = ``
      }

      if (typeof commit.hash === `string`) {
        commit.hash = commit.hash.substring(0, 7)
      }

      if (typeof commit.subject === `string`) {
        let url = context.repository
          ? `${context.host}/${context.owner}/${context.repository}`
          : context.repoUrl
        if (url) {
          url = `${url}/issues/`
          // Issue URLs.
          commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
            issues.push(issue)
            return `[#${issue}](${url}${issue})`
          })
        }
        if (context.host) {
          // User URLs.
          commit.subject = commit.subject.replace(
            /\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g,
            (_, username) => {
              if (username.includes('/')) {
                return `@${username}`
              }

              return `[@${username}](${context.host}/${username})`
            }
          )
        }
      }

      // remove references that already appear in the subject
      commit.references = commit.references.filter(reference => {
        if (issues.indexOf(reference.issue) === -1) {
          return true
        }

        return false
      })

      if (bugsUrl) {
        commit.references = commit.references.map(ref => {
          return {
            ...ref,
            bugsUrl
          }
        })
      }

      return commit
    },
    groupBy: `type`,
    commitGroupsSort: `title`,
    commitsSort: [`scope`, `subject`],
    noteGroupsSort: `title`,
    notesSort: compareFunc
  }
}
