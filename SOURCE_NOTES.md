# Language research and source notes

The central editable registry is `content.sources`, `content.vocabulary`, and `content.characters` in [`src/content.js`](src/content.js). Language is now displayed in the game, with English meanings and source links. Cultural and classroom review is still pending.

## Live dictionary access

Requests to https://ojibwe.lib.umn.edu/ and its nibi entry on 2026-10-14 returned proxy **403 Forbidden**. A retry confirmed the same restriction. The domain was added to the saved environment network draft; the running machine has not yet received that access. No network restriction or TLS verification was bypassed.

The findings below were checked in independently hosted published resources. They are **archival verification, not current live dictionary lookup**.

## Sources actually consulted

1. [ELF Lab OjibweLexicon](https://github.com/ELF-Lab/OjibweLexicon/tree/dba4e5c008c886d4835e64150f97e25b26b3dab1), especially `OPD/NOUNS.csv`, `OPD/VERBS.csv`, and the nookomis inflection record. Its README identifies the data as OPD-derived. This source verifies lemmas, morphology, and original entry URLs; its lexical CSVs do not provide English definitions. Citation: Hammerly, Livesay, Arppe, Stacey & Silfverberg (2026), *OjibweMorph*, Language Resources and Evaluation, 60, 1–44, DOI 10.1007/s10579-025-09887-4.
2. [Published OPD export, pinned 2020 snapshot](https://github.com/jacobsolinsky/opd/blob/960b9c95ce13743053ee03246698a4c331ccbb83/dataEntry/all_entries3.json), with [speaker metadata](https://github.com/jacobsolinsky/opd/blob/960b9c95ce13743053ee03246698a4c331ccbb83/database/speakers.json). This third-party archive stores original entry paths, glosses, inflected/basic forms, and recorded head speakers. The last repository commit is 2020-08-13. It is not represented as an official current OPD publication.
3. [Freelang Ojibwe dictionary export](https://github.com/george-steel/ojibwe-dict-app/blob/a7865eac8337348c13f5964afab5804a783f8981/data/dictionary.tsv), with its [compiler/provenance document](https://github.com/george-steel/ojibwe-dict-app/blob/a7865eac8337348c13f5964afab5804a783f8981/data/ojibwe_readme.pdf). Compilers: Weshki-ayaad, Charlie Lippert, and Guy Gambill. The provenance document credits consulted Mille Lacs and Bois Forte educators; page 4 identifies unmarked entries as Southwestern/Minnesota, using double-vowel spelling. This independent dictionary corroborates the core words and supplies meanings for the nickname proposals.

## Words checked

| Game form | English meaning | Original OPD entry | Recorded head-speaker context in the archive |
| --- | --- | --- | --- |
| nibi | water | [nibi-ni](https://ojibwe.lib.umn.edu/main-entry/nibi-ni) | Nancy Jones, Nigigoonsiminikaaning |
| zhiiwaagamizigan | syrup; maple syrup | [zhiiwaagamizigan-ni](https://ojibwe.lib.umn.edu/main-entry/zhiiwaagamizigan-ni) | Nancy Jones, Nigigoonsiminikaaning |
| ziinzibaakwadwaaboo | maple sap | [ziinzibaakwadwaaboo-ni](https://ojibwe.lib.umn.edu/main-entry/ziinzibaakwadwaaboo-ni) | No head speaker recorded |
| miinan | blueberries; plural of miin, a blueberry | [miin-ni](https://ojibwe.lib.umn.edu/main-entry/miin-ni) | Eugene Stillday, Obaashiing / Red Lake |
| manoomin | wild rice | [manoomin-ni](https://ojibwe.lib.umn.edu/main-entry/manoomin-ni) | Leona Wakonabo, Cha-cha-bah-ning / Leech Lake |
| giigoonh | a fish | [giigoonh-na](https://ojibwe.lib.umn.edu/main-entry/giigoonh-na) | Gerri Howard, Cha-cha-bah-ning / Leech Lake |
| nookomis | my grandmother | [nookomis-nad](https://ojibwe.lib.umn.edu/main-entry/nookomis-nad) | Eugene Stillday, Obaashiing / Red Lake |
| ziigwan | it is spring | [ziigwan-vii](https://ojibwe.lib.umn.edu/main-entry/ziigwan-vii) | Eugene Stillday, Obaashiing / Red Lake |
| niibin | it is summer | [niibin-vii](https://ojibwe.lib.umn.edu/main-entry/niibin-vii) | Eugene Stillday, Obaashiing / Red Lake |
| dagwaagin | it is fall / autumn | [dagwaagin-vii](https://ojibwe.lib.umn.edu/main-entry/dagwaagin-vii) | Eugene Stillday, Obaashiing / Red Lake |
| biboon | it is winter | [biboon-vii](https://ojibwe.lib.umn.edu/main-entry/biboon-vii) | No head speaker recorded |

The archive's entry region lists are empty. A recorded speaker's community is source context, not a claim that a word belongs exclusively to that community or that all entries share one dialect. Local preferred forms remain for review. The explicit miinan plural is in the archived basic forms; it was not invented by guessing an ending.

## Character nickname choices

| Character | Fictional nickname | Word meaning and source |
| --- | --- | --- |
| Nora | Waaban | it is dawn / morning; [OPD-derived lemma row](https://github.com/ELF-Lab/OjibweLexicon/blob/dba4e5c008c886d4835e64150f97e25b26b3dab1/OPD/VERBS.csv#L25540), Freelang lines 83713–83716 |
| Rose | Waabigwan | a flower; [OPD-derived lemma row](https://github.com/ELF-Lab/OjibweLexicon/blob/dba4e5c008c886d4835e64150f97e25b26b3dab1/OPD/NOUNS.csv#L4048), Freelang line 84119 |
| Leena | Niibin | it is summer; OPD-derived entry and archived gloss above |
| Grandma June | nookomis, in the player’s narration | my grandmother; a relationship term, **not** June’s personal name |

The three nicknames are creative choices for this fictional story. The ordinary-word meanings are sourced; no claim is made that these are customary bestowed personal names or naming traditions. Suitability of the nickname choices remains for local review. June, Eli, Dan, Ada, and Tess keep their personal names. No real speaker’s publicly shared name is assigned to a fictional character.

## Scope and remaining work

No pronunciation audio or original Ojibwe sentences were generated. English commands remain accepted; the sourced words and nicknames are optional command aliases. Local American Indian Education and relevant language partners have not yet reviewed or endorsed this game. Teachings and practices remain fictional classroom applications requiring review as described in `CONTENT_REVIEW.md`.
