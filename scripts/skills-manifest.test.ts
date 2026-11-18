import { describe, expect, it } from "bun:test"
import { cliFloor, cliVersionFloor } from "./cli-range"
import { CLI_VERSION_FLOOR } from "./manifest-floor"
import { metadataCli, withMetadataCli } from "./skill-metadata"
import {
	FORMAT_VERSION,
	MANIFEST_PATH,
	manifestProblems,
	parseSkillManifest,
	type SkillManifest,
} from "./skills-manifest"
import {
	manifest,
	ONBOARDING_SKILL_PATH,
	OPERATING_SKILL_PATH,
	PUBLISHED_SKILLS,
	read,
	skillDirectories,
} from "./skills-test-support"

/** The manifest with one row replaced, so one rule can fail alone. */
function manifestWith(skills: SkillManifest["skills"]): SkillManifest {
	return { formatVersion: FORMAT_VERSION, skills }
}

const ROW = { name: "traj", path: "skills/traj", cliRange: ">=0.2.0 <0.3.0" }

describe("the Skill Manifest", () => {
	it("publishes exactly the directories under skills/, in install order", () => {
		expect(manifestProblems(manifest, skillDirectories())).toEqual([])
		expect(PUBLISHED_SKILLS).toEqual([
			"traj-onboarding",
			"traj",
			"traj-import",
			"traj-review",
			"traj-plan",
		])
		expect(manifest.formatVersion).toBe(FORMAT_VERSION)
	})

	it("authors the CLI Range once, and every current Skill expects the same one", () => {
		for (const row of manifest.skills) expect(row.cliRange).toBe(">=0.2.0 <0.3.0")
		expect(cliVersionFloor(manifest.skills)).toBe(CLI_VERSION_FLOOR)
	})

	it("is the file the into-repository instructions point at", () => {
		expect(read("AGENTS.md")).toContain("`skills.manifest.json`")
		expect(MANIFEST_PATH).toBe("skills.manifest.json")
	})

	it("refuses a skills/ directory with no manifest row", () => {
		const problems = manifestProblems(manifest, [...skillDirectories(), "traj-invented"])
		expect(problems).toEqual(["skills/traj-invented has no manifest row, so nothing publishes it"])
	})

	it("refuses a manifest row with no directory", () => {
		const problems = manifestProblems(
			manifestWith([...manifest.skills, { ...ROW, name: "traj-gone", path: "skills/traj-gone" }]),
			skillDirectories(),
		)
		expect(problems).toContain('"traj-gone" has a manifest row but no skills/traj-gone directory')
	})

	it("refuses a duplicate name or path, and a path that is not the Skill's own directory", () => {
		expect(manifestProblems(manifestWith([ROW, ROW]), ["traj"])).toContain('"traj" is listed twice')
		expect(manifestProblems(manifestWith([ROW, { ...ROW, name: "traj-two" }]), ["traj"])).toContain(
			'"skills/traj" is listed twice',
		)
		expect(manifestProblems(manifestWith([{ ...ROW, path: "skills/other" }]), ["traj"])).toContain(
			'"traj" lives at "skills/other", not "skills/traj"',
		)
	})

	it("refuses another format version, a name that is not a Skill name, and an unusable range", () => {
		const other: SkillManifest = { formatVersion: 2, skills: [ROW] }
		expect(manifestProblems(other, ["traj"])).toContain("formatVersion 2 is not 1")
		expect(manifestProblems(manifestWith([{ ...ROW, name: "Traj_Skill" }]), [])).toContain(
			'"Traj_Skill" is not a Skill name',
		)
		expect(manifestProblems(manifestWith([{ ...ROW, cliRange: "latest" }]), ["traj"])).toContain(
			'"traj" states no usable CLI Range: a CLI Range takes ">=x.y.z" comparators, not "latest"',
		)
		expect(manifestProblems(manifestWith([]), [])).toContain("the manifest lists no Skill")
	})

	it("refuses a manifest that is not the documented shape", () => {
		expect(() => parseSkillManifest("{")).toThrow(`${MANIFEST_PATH} is not JSON`)
		expect(() => parseSkillManifest("[]")).toThrow(`${MANIFEST_PATH} has no numeric formatVersion`)
		expect(() => parseSkillManifest('{"formatVersion":1}')).toThrow("has no skills array")
		expect(() => parseSkillManifest('{"formatVersion":1,"skills":[{"name":"traj"}]}')).toThrow(
			"skills.manifest.json: skills[0] has no path",
		)
	})
})

describe("a CLI Range", () => {
	it("takes its floor from the lower bound, which is the CLI Version Floor", () => {
		expect(cliFloor(">=0.2.0 <0.3.0")).toBe("0.2.0")
		expect(cliFloor(">=1.4.0-alpha.2")).toBe("1.4.0-alpha.2")
	})

	it("refuses a range with no lower bound, or one whose upper bound is not above it", () => {
		expect(() => cliFloor("<0.3.0")).toThrow('must state a ">=" lower bound')
		expect(() => cliFloor(">=0.3.0 <0.2.0")).toThrow("upper bound orders below its floor")
		expect(() => cliFloor("")).toThrow("must state a lower bound")
	})

	it("reads the floor from the operating Skill's row alone", () => {
		expect(cliVersionFloor(manifest.skills)).toBe("0.2.0")
		expect(() => cliVersionFloor(manifest.skills.filter((row) => row.name !== "traj"))).toThrow(
			'the manifest has no "traj" row',
		)
	})
})

describe("the frontmatter copy of a range", () => {
	it("equals each Skill's manifest row, so the range is authored only in the manifest", () => {
		for (const row of manifest.skills) {
			expect(metadataCli(read(`${row.path}/SKILL.md`))).toBe(row.cliRange)
		}
	})

	it("is what the generator writes, so a drifted copy is one command from correct", () => {
		for (const path of [ONBOARDING_SKILL_PATH, OPERATING_SKILL_PATH]) {
			const source = read(path)
			expect(withMetadataCli(source, ">=9.9.9 <10.0.0")).not.toBe(source)
			expect(metadataCli(withMetadataCli(source, ">=9.9.9 <10.0.0"))).toBe(">=9.9.9 <10.0.0")
			expect(withMetadataCli(withMetadataCli(source, ">=9.9.9 <10.0.0"), ">=9.9.9 <10.0.0")).toBe(
				withMetadataCli(source, ">=9.9.9 <10.0.0"),
			)
		}
	})

	it("adds a metadata block to a Skill that declares none", () => {
		const bare = "---\nname: traj-thin\ndescription: x\n---\n\n# Body\n"
		expect(withMetadataCli(bare, ">=0.2.0 <0.3.0")).toBe(
			'---\nname: traj-thin\ndescription: x\nmetadata:\n  cli: ">=0.2.0 <0.3.0"\n---\n\n# Body\n',
		)
		expect(metadataCli(bare)).toBeNull()
		expect(() => withMetadataCli("# no frontmatter\n", ">=0.2.0 <0.3.0")).toThrow(
			"must open with a --- frontmatter block",
		)
	})
})
