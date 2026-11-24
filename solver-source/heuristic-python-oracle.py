"""Generate independent regression fixtures from the supplied master notebook definitions.

Usage: PYTHONHASHSEED=0 python heuristic-python-oracle.py path/to/master_code_extracted.py
The source is trusted project code. Only the explicitly listed function/class definitions
are loaded; no notebook imports, cells, file reads, caches, or solver are executed.
"""
import ast
from collections import Counter, defaultdict
from itertools import combinations
import json
import math
from pathlib import Path
import random
import sys
import time

NAMES = set('move_allowance can_move bidding_sets clashing_pairs is_separable make_scenario summarize timetable_after clean_up check_plan prepare masks_after bound_left most_credits fewest_credits_cover student_best gap touched best_moves_for score_move pair_rescue fix_timetable Seats static_order first_allotment repick make_room deep_repick switch_trade repair allot_core free_gap unblock pick_group hand_out_again change_since ruin_and_recreate fill score trim_courses run_heuristic'.split())

def load_source(path):
    source = ast.parse(Path(path).read_text())
    nodes = [n for n in source.body if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.name in NAMES]
    if {n.name for n in nodes} != NAMES:
        raise ValueError('Master source is missing a required heuristic definition')
    ns = dict(math=math, random=random, time=time, Counter=Counter, defaultdict=defaultdict, combinations=combinations,
              HEURISTIC_ROUNDS=60, HEURISTIC_PATIENCE=20, HEURISTIC_GROUP=4, HEURISTIC_SEED=2026)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), 'exec'), ns)
    return ns

def world_for(inp, cfg):
    units = {u['unit_id']: u for u in inp['units']}
    return {'slots': {u: {(s['date'], s['slot']) for s in inp['sessions'] if s['unit_id'] == u} for u in units},
            'class_slots': {u: {(s['date'], s['slot']) for s in inp['sessions'] if s['unit_id'] == u and s['session_type'] == 'class'} for u in units},
            'movable': {u: bool(v['movable']) for u,v in units.items()}, 'credits': {u: v['credits'] for u,v in units.items()},
            'caps': {u: v['seat_cap'] for u,v in units.items()}, 'outside': {u for u,v in units.items() if v['is_pgpx_or_fabm']},
            'group_of': {u: g for g, us in inp['groups'].items() for u in us},
            'max_credits': cfg['maxCredits'], 'outside_limit': 1}

def clean(plan):
    return {'allocation': {i: sorted(us) for i,us in sorted(plan['allocation'].items())},
            'moves': [{'unit_id':u, 'date':d, 'slot':str(t)} for u,(d,t) in sorted(plan['moves'])],
            'asked': sorted(plan['asked']), 'short':plan['short'], 'students_short':plan['students_short'], 'credits':plan['credits']}

def make_input(slots, students, credits=None, caps=None, outside=(), blocks=(), groups=None, immovable=()):
    return {'units':[{'unit_id':u,'credits':(credits or {}).get(u,1),'seat_cap':(caps or {}).get(u,10),'movable':int(u not in immovable),'is_pgpx_or_fabm':int(u in outside)} for u in sorted(slots)],
            'sessions':[{'unit_id':u,'date':'2026-12-01','slot':str(t),'session_type':'block' if (u,t) in blocks else 'class'} for u,ts in sorted(slots.items()) for t in sorted(ts)],
            'groups':groups or {}, 'students':students}

def fixtures():
    cases=[]
    def add(name, inp, floor=2, ceiling=2, theta=0, version='without'):
        cases.append({'name':name,'input':inp,'settings':{'floor':floor,'maxCredits':ceiling,'theta':theta,'version':version,'heuristicRounds':60,'heuristicPatience':20,'heuristicGroup':4,'heuristicSeed':2026}})
    inp=make_input({'A':[1,2],'B':[1,3],'C':[3,4]},{'S1':['A','B'],'S2':['B','C'],'S3':['A','B']})
    for theta in [0,.5,1]: add('notebook-A-'+str(theta),inp,theta=theta)
    add('notebook-B-external-limit',make_input({'A':[1],'P':[2],'Q':[3]},{'S1':['A']},outside=['P','Q']),floor=3,ceiling=9,version='with')
    add('notebook-C-block',make_input({'A':[1,2],'B':[1,3]},{'S1':['A','B']},blocks=[('A',1)]),theta=.5)
    for version in ['with','without']:
        add('notebook-D-'+version,make_input({'A':[1],'P':[2]},{'S1':['A']},outside=['P']),ceiling=9,version=version)
    add('same-content',make_input({'A':[1],'B':[2],'C':[3]},{'S1':['A','B','C']},groups={'G':['A','B']}),floor=3,ceiling=3)
    add('protected-only-clash',make_input({'A':[1],'B':[1]},{'S1':['A','B']},blocks=[('A',1),('B',1)]),theta=1)
    add('fractional-ceiling',make_input({'A':[1],'B':[2],'C':[3]},{'S1':['A','B','C']},credits={'A':.75,'B':1.25,'C':1.5}),floor=1.75,ceiling=2.25)
    add('scarce-seat-repair',make_input({'A':[1],'B':[2],'C':[3]},{'S1':['A','B'],'S2':['A','C'],'S3':['B','C']},caps={'A':1,'B':1,'C':1}),floor=1.5,ceiling=2)
    rng=random.Random(9363)
    for k in range(12):
        names=['A','B','C','D','E','P']
        slots={u:sorted(rng.sample(range(1,8),2)) for u in names}
        students={f'S{i:02}':sorted(rng.sample(names[:-1],rng.choice([2,3,4]))) for i in range(1,9)}
        credits={u:rng.choice([.5,.75,1,1.25]) for u in names}
        caps={u:rng.choice([1,2,3,4]) for u in names}
        blocks=[(u,t) for u,ts in slots.items() for t in ts if rng.random()<.15]
        inp=make_input(slots,students,credits=credits,caps=caps,outside=['P'],blocks=blocks,groups={'G':['A','B']} if k%3==0 else {},immovable=['E'] if k%4==0 else [])
        add('seeded-capacity-'+str(k),inp,floor=1.5,ceiling=2.5,theta=[0,.5,1][k%3],version='with' if k%2 else 'without')
    return cases

def main():
    ns=load_source(sys.argv[1]); cases=fixtures()
    for row in cases:
        cfg=row['settings']; inp=row['input']
        plan=ns['run_heuristic'](world_for(inp,cfg),{i:set(us) for i,us in inp['students'].items()},cfg['floor'],cfg['version'],cfg['theta'])
        row['expected']=clean(plan)
    lengths=[1,2,3,4,5,8,10,17,32,100,416]*3
    random_samples=[]
    for seed in [0,1,2026,4294967297]:
        rng=random.Random(seed)
        random_samples.append({'seed':seed,'lengths':lengths,'indexes':[rng.randrange(n) for n in lengths]})
    payload={'randomSamples':random_samples,'provenance':'Unmodified heuristic definitions extracted by AST from the supplied updated master notebook; Python PYTHONHASHSEED=0. Runtime is excluded.','cases':cases}
    target=Path(sys.argv[2]) if len(sys.argv)>2 else Path(__file__).with_name('heuristic-oracle.json')
    target.write_text(json.dumps(payload,indent=2)+'\n')
    print(f'Wrote {len(cases)} Python heuristic fixtures to {target}')

if __name__=='__main__':main()
