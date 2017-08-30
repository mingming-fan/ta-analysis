import json

results = []

with open('Batch_2919571_batch_results.csv', 'r') as resultFile:
       fileContent = resultFile.readlines()

del fileContent[0]

for line in fileContent:
    data = line.strip().split(',')
    results.append([data[-5], data[-2], data[-1]])

count = {}

for r in results:
    if r[0] not in count.keys():
        count[r[0]] = {
            "category": {
                "Observation": 0,
                "Explanation": 0,
                "Procedure": 0,
                "Reading": 0
            },
            "sentiment": {
                "Positive": 0,
                "Neutral": 0,
                "Negative": 0
            }
        }

    count[r[0]]["category"][r[1]] += 1
    count[r[0]]["sentiment"][r[2]] += 1

outfile = open('conglomerate.csv', 'w');
maxfile = open('max.csv','w')

outfile.write(','.join(['','','']))

resObj = {}

for audio in count:
    task_details = audio.split('/')
    participant = task_details[-3]

    if task_details[-2].startswith('copier'):
        task = 2
    else:
        task = 1

    segment = task_details[-1].split('.')[0]

    audioObj = count[audio]

    line = [participant,task,segment,
            audioObj['category']['Observation'],
            audioObj['category']['Explanation'],
            audioObj['category']['Procedure'],
            audioObj['category']['Reading'],
            audioObj['sentiment']['Positive'],
            audioObj['sentiment']['Neutral'],
            audioObj['sentiment']['Negative']]

    label = ""
    max = 0

    for cat in ['Observation', 'Explanation', 'Procedure', 'Reading']:
        if audioObj['category'][cat] > max:
            max = audioObj['category'][cat]
            label = cat;

    max = 0
    feel = ""
    for sent in ['Positive', 'Neutral', 'Negative']:
        if audioObj['sentiment'][sent] > max:
            max = audioObj['sentiment'][sent]
            feel = sent

    num = participant[1]

    name = num+'/'+str(task)+'/'+segment +'.wav'

    res = [name, label, feel]

    if num not in resObj:
        resObj[num] = {}

    if str(task) not in resObj[num]:
        resObj[num][str(task)] = {}

    resObj[num][str(task)][name] = res[1:]

    outfile.write(','.join([str(l) for l in line]) + '\n')
    maxfile.write(','.join([str(r) for r in res]) + '\n')

outfile.close()
maxfile.close()

with open('audiolengthinfo.csv', 'r') as durationFile:
    fileContent = durationFile.readlines()

durationObject = {}

for line in fileContent:
    lalala = line.strip().split(',')
    durationObject[lalala[0]] = lalala[1:]

sentval = {
    'Positive': "1.0",
    'Neutral': "0.0",
    'Negative': "-1.0"
}

for participant in resObj:
    for task in resObj[participant]:
        filename = 'p' + participant + 't' + task + '.json'
        sentfile = 'p' + participant + 't' + task + 'sentiment.json'
        results = []
        sentiment = []
        for segment in resObj[participant][task]:
            seg = {}
            segsent = {}
            label,sent= resObj[participant][task][segment]

            duration = durationObject[segment]

            seg['label'] = label
            seg['start_time'] = float(duration[0])
            seg['end_time'] = float(duration[1])

            segsent['start'] = duration[0]
            segsent['end'] = duration[1]
            segsent['data'] = sentval[sent]

            results.append(seg)
            sentiment.append(segsent)

        with open(filename, 'w') as output:
            json.dump(results,output,indent=2)

        with open(sentfile, 'w') as output:
            json.dump(sentiment,output,indent=2)