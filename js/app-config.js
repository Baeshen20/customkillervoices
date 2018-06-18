define({
	appDirName: 'KillerVoices',
	voicePacksDir: 'VoicePacks',
	windows: {
		main: {
			width	: 1200,
			height	: 880
		},
		notice: {
			width	: 400,
			height	: 732
		}
	},
	defaultVolume: 75,
	defaultVP: 'Arnold',
	games: [
		{
			id		: 5426,
			name	: 'League_of_Legends',
			title	: 'League of Legends',
			useGEP	: true,
			customSlots	: {
				kill		: 'Kill',
				death		: 'Death',
				match_start	: 'Game start',
				match_end	: 'Game end',
				double_kill	: 'Double kill',
				triple_kill	: 'Triple kill',
				quadra_kill	: 'Quadra kill',
				penta_kill	: 'Penta kill'
			}
		},
		{
			id		: 21216,
			name	: 'Fortnite',
			title	: 'Fortnite',
			useGEP	: true,
			customSlots	: {
				kill		: 'Kill',
				knockout	: 'Knockout',
				death		: 'Death',
				knockedout	: 'Knocked Out',
				match_start	: 'Game start',
				match_end	: 'Game end'
			}
		},
		{
			id		: 10906,
			name	: 'PUBG',
			title	: 'PLAYERUNKNOWN\'S BATTLEGROUNDS',
			short	: 'PUBG',
			useGEP	: true,
			customSlots	: {
				kill 		: 'Kill',
				knockout	: 'Knocked Out',
				death		: 'Death',
				match_start	: 'Game start',
				match_end	: 'Game end'
			}
		},
		{
			id		: 7764,
			name	: 'CSGO',
			title	: 'Counter-Strike: Global Offensive',
			short	: 'CS:GO',
			useGEP	: true,
			customSlots	: {
				kill			: 'Kill',
				death			: 'Death',
				headshot		: 'Headshot',
				assist			: 'Assist',
				bomb_planted	: 'Bomb planted',
				match_start		: 'Game start',
				match_end		: 'Game end' // does not work
			}
		},
		/*{
			id		: 10844,
			name	: 'Overwatch',
			title	: 'Overwatch',
			useGEP	: true,
			customSlots	: {
				kill		: 'Kill',
				death		: 'Death',
				match_start	: 'Game start',
				match_end	: 'Game end',
				headshot	: 'Headshot',
				double_kill	: 'Double kill',
				triple_kill	: 'Triple kill',
				quadra_kill	: 'Quadruple kill',
				penta_kill	: 'Quintuple kill',
				six_kill	: 'Sixtaple kill'
			}
		},*/
		{
			id		: 7314,
			name	: 'Dota2',
			title	: 'Dota 2',
			useGEP	: true,
			customSlots	: {
				kill		: 'Kill',
				death		: 'Death',
				match_start	: 'Game Start',
				match_end	: 'Game End',
				double_kill	: 'Double kill',
				triple_kill	: 'Triple kill',
				quadra_kill	: 'Ultra kill',
				penta_kill	: 'RAMPAGE'
			}
		},
		{
			id		: 8134,
			name	: 'Smite',
			title	: 'Smite',
			useGEP	: false,
			customSlots	: {
				kill	: 'Kill',
				death	: 'Death'
			}
		},
		{
			id		: 7784,
			name	: 'Warface',
			title	: 'Warface',
			useGEP	: false,
			customSlots	: {
				kill : 'Kill'
			}
		}
	],
	unavailableGames: [],
	eventCategories: {
		kill: [
			'kill',
			'player_death',
			'kill_in_slide',
			'kill_melee',
			'kill_grenade',
			'grenade_kills_in_a_row_1',
			'grenade_kills_in_a_row_2',
			'grenade_kills_in_a_row_3',
			'melee_kills_in_a_row_1',
			'melee_kills_in_a_row_2',
			'melee_kills_in_a_row_3',
			'defibrillator_kill',
			'in_knock_back_kill',
			'claymore_kill',
			'pvp_flag_kill',
			'pvp_flag_returned',
			'dmn_defend_kills_1',
			'dmn_attack_kills_1',

			'announcer_rampage_team',
			'announcer_rampage_enemy',
			'announcer_unstoppable_team',
			'announcer_unstoppable_enemy',
			'announcer_dominating_team',
			'announcer_dominating_enemy',
			'announcer_godlike_team',
			'announcer_godlike_enemy',
			'announcer_legendary_team',
			'announcer_legendary_enemy',
			'announcer_ace_team',
			'announcer_ace_enemy',
		],
		double_kill : [
			'double_kill',
			'two_at_once_kill',

			'announcer_double_kill_team',
			'announcer_double_kill_enemy',
		],
		triple_kill : [
			'triple_kill',
			'pvp_triple_kill',

			'announcer_triple_kill_team',
			'announcer_triple_kill_enemy',
		],
		quadra_kill : [
			'quadra_kill',

			'announcer_quadra_kill_team',
			'announcer_quadra_kill_enemy',
		],
		penta_kill : [
			'penta_kill',

			'announcer_penta_kill_team',
			'announcer_penta_kill_enemy',
		],
		six_kill : [
			'six_kill'
		],
		knockout : [
			'knockout'
		],
		death: [
			'death',

			'announcer_slain_self_team',
			'announcer_slain_self_enemy',
			'announcer_executed_minion',
			'announcer_executed_tower',
			'announcer_executed_turret',
			'announcer_executed',
		],
		knockedout : [
			'knockedout'
		],
		assist: [
			'assist',
		],
		match_start: [
			'match_start',

			'announcer_welcome_rift',
		],
		match_end: [
			'match_end',

			'announcer_defeat',
			'announcer_victory',
		],
		headshot: [
			'headshot',
			'kill_headshot',
			'headshots_in_a_row_2',
			'headshots_in_a_row_3',
			'headshots_in_a_row_4',
			'headshots_in_a_row_5',
		],
		bomb_planted: [
			'bomb_planted',
		]
	},
	gameFeatures: [
		'death',
		'kill',
		'assist',
		'headshot',
		'round_start',
		'match_start',
		'team_round_win',
		'bomb_planted',
		'player death',
		'kill_in_slide',
		'kill_headshot',
		'kill_melee',
		'kill_grenade',
		'teammate_protected',
		'protected_by_teammate',
		'ctf_flag_pickup',
		'ctf_flag_drop',
		'ctf_flag_return',
		'ptb_bomb_plant',
		'ptb_bomb_defuse',
		'ptb_bomb_pickup',
		'ptb_bomb_drop',
		'ptb_round_win_bomb_exploded',
		'ptb_round_loose_bomb_exploded',
		'dmn_cp_1_captured_our_team',
		'dmn_cp_2_captured_our_team',
		'dmn_cp_3_captured_our_team',
		'dmn_cp_all_captured_our_team',
		'objective_completed_core1att',
		'objective_completed_core2att',
		'stm_round_att_all_cores_captured',
		'stm_round_def_all_cores_captured',
		'achievement_gained',
		'headshots_in_a_row_2',
		'headshots_in_a_row_3',
		'headshots_in_a_row_4',
		'headshots_in_a_row_5',
		'grenade_kills_in_a_row_1',
		'grenade_kills_in_a_row_2',
		'grenade_kills_in_a_row_3',
		'melee_kills_in_a_row_1',
		'melee_kills_in_a_row_2',
		'melee_kills_in_a_row_3',
		'defibrillator_kill',
		'in_knock_back_kill',
		'claymore_kill',
		'two_at_once_kill',
		'double_kill',
		'pvp_triple_kill',
		'pvp_flag_kill',
		'pvp_flag_returned',
		'dmn_defend_kills_1',
		'dmn_attack_kills_1',
		'match',
		'kills',
		'assists',
		'announcer',
		'preGame',
		'postGame',
		'player',
		'roster',
		'knockout',
		'phase',
		'revived',
		'match_state_changed',
		'match_ended'
	]
});
