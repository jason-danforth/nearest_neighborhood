import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sqlalchemy import create_engine, func
from flask import Flask, jsonify, render_template, redirect, request


app = Flask(__name__)


def run_query(zipcode):
    
    zipcode = int(zipcode)

    # Create Engine
    database_path = "zipcodeDB.sqlite"
    engine = create_engine(f"sqlite:///{database_path}")
    conn = engine.connect()

    # Query records to test that it works
    data_df = pd.read_sql("SELECT * FROM zip_table", conn)

    # Split DFs so that selected outer zipcode can find nearest neighbor zip in Manhattan
    manhattan_df = data_df[data_df.borocode == "Manhattan"]
    outer_borough_df = data_df[data_df.borocode != "Manhattan"]

    # Create dictObj
    # This formatting is reuired for the D3 chart, and is (believe it or not) the cleanest solution I could come up with...
    dictObj = {"manhattan": {"borough": "",
                            "zipcode": "",
                            "neighborhood": "",
                            "values": {"A": {"color": "#FFDD80", 
                                            "GFA": 0,
                                            "label": "1 & 2 Family Residential"},
                                        "B": {"color": "#ff9100",
                                            "GFA": 0,
                                            "label": "Multi-Family Walk-up"},
                                        "C": {"color": "#bf360c",
                                            "GFA": 0,
                                            "label": "Multi-Family Elevator"},
                                        "D": {"color": "#ff5252",
                                            "GFA": 0,
                                            "label": "Mixed Residential & Commercial"},
                                        "E": {"color": "#c51162",
                                            "GFA": 0,
                                            "label": "Commercial & Office"},
                                        "F": {"color": "#7b1fa2",
                                            "GFA": 0,
                                            "label": "Industrial & Manufacturing"},
                                        "G": {"color": "#ba68c8",
                                            "GFA": 0,
                                            "label": "Transportation & Utility"},
                                        "H": {"color": "#0d47a1",
                                            "GFA": 0,
                                            "label": "Public Facilities & Institutions"},
                                        "I": {"color": "#00bfa5",
                                            "GFA": 0,
                                            "label": "Open Space & Outdoor Recreation"},
                                        "J": {"color": "#607d8b",
                                            "GFA": 0, 
                                            "label": "Parking"},
                                        "K": {"color": "#263238",
                                            "GFA": 0,
                                            "label": "Vacant Land"}
                                    }
                            },
            "outer": {"borough": "",
                    "zipcode": "",
                    "neighborhood": "",
                    "values": {"A": {"color": "#FFDD80", 
                                    "GFA": 0,
                                    "label": "1 & 2 Family Residential"},
                                "B": {"color": "#ff9100",
                                    "GFA": 0,
                                    "label": "Multi-Family Walk-up"},
                                "C": {"color": "#bf360c",
                                    "GFA": 0,
                                    "label": "Multi-Family Elevator"},
                                "D": {"color": "#ff5252",
                                    "GFA": 0,
                                    "label": "Mixed Residential & Commercial"},
                                "E": {"color": "#c51162",
                                    "GFA": 0,
                                    "label": "Commercial & Office"},
                                "F": {"color": "#7b1fa2",
                                    "GFA": 0,
                                    "label": "Industrial & Manufacturing"},
                                "G": {"color": "#ba68c8",
                                    "GFA": 0,
                                    "label": "Transportation & Utility"},
                                "H": {"color": "#0d47a1",
                                    "GFA": 0,
                                    "label": "Public Facilities & Institutions"},
                                "I": {"color": "#00bfa5",
                                    "GFA": 0,
                                    "label": "Open Space & Outdoor Recreation"},
                                "J": {"color": "#607d8b",
                                    "GFA": 0, 
                                    "label": "Parking"},
                                "K": {"color": "#263238",
                                    "GFA": 0,
                                    "label": "Vacant Land"}
                                    }
                            }
            }

    target_borough = data_df.borocode[data_df.zipcode == zipcode].tolist()[0]
    target_neighborhood = data_df.neighborhood[data_df.zipcode == zipcode].tolist()[0]

    # INITIAL QUERY
    if target_borough == 'Manhattan':
        # Pull out target zipcode from manhattan_df
        target_df = manhattan_df[manhattan_df.zipcode == zipcode]
        
        # Define zipcode, neighborhood, borough
        dictObj["manhattan"]["zipcode"] = zipcode
        dictObj["manhattan"]["neighborhood"] = target_neighborhood
        dictObj["manhattan"]["borough"] = target_borough
        
        for item in dictObj["manhattan"]["values"]:
            value_type = dictObj["manhattan"]["values"][item]["label"]
            dictObj["manhattan"]["values"][item]["GFA"] = target_df[value_type].tolist()[0]
        
        
    else:
        # Pull out target zipcode from outer_borough_df
        target_df = outer_borough_df[outer_borough_df.zipcode == zipcode]
        
        # Define zipcode, neighborhood, and borough
        dictObj["outer"]["zipcode"] = int(zipcode)
        dictObj["outer"]["neighborhood"] = target_neighborhood
        dictObj["outer"]["borough"] = target_borough
        
        for item in dictObj["outer"]["values"]:
            value_type = dictObj["outer"]["values"][item]["label"]
            dictObj["outer"]["values"][item]["GFA"] = target_df[value_type].tolist()[0]


    # KNN
    if target_borough == 'Manhattan': #i.e. the nearest neighbor will NOT be in Manhattan

        # Combine with Outerborough df to train model
        train_data = pd.concat([target_df, outer_borough_df])

        # Drop column with strings (b/c KNN needs numeric data) and reset index
        train_data.drop("borocode", axis=1, inplace=True)
        train_data.drop("neighborhood", axis=1, inplace=True)
        train_data.reset_index(drop=True, inplace=True)
        
        # Train Nearest Neighbors model
        nbrs = NearestNeighbors(n_neighbors=2, algorithm='ball_tree').fit(train_data)
        distances, indices = nbrs.kneighbors(train_data)

        # Find nearest neighbor
        nearest_neighbor_index = indices[0][1]
        result = train_data.iloc[nearest_neighbor_index, :]
        
        # Define zipcode and borough
        result_zipcode = int(result["zipcode"])
        result_neighborhood = data_df[data_df.zipcode == result["zipcode"]].neighborhood.tolist()[0]
        result_borough = data_df[data_df.zipcode == result["zipcode"]].borocode.tolist()[0]
        dictObj["outer"]["zipcode"] = result_zipcode
        dictObj["outer"]["neighborhood"] = result_neighborhood
        dictObj["outer"]["borough"] = result_borough
        
        for item in dictObj["outer"]["values"]:
            value_type = dictObj["outer"]["values"][item]["label"]
            dictObj["outer"]["values"][item]["GFA"] = result[value_type]

    
    else: # i.e. the nearest neighbor IS in Manhattan

        # Combine with Manhattan df to train model
        train_data = pd.concat([target_df, manhattan_df])
        
        # Drop column with strings and reset index
        train_data.drop("borocode", axis=1, inplace=True)
        train_data.drop("neighborhood", axis=1, inplace=True)
        train_data.reset_index(drop=True, inplace=True)
        
        # Train Nearest Neighbors model
        nbrs = NearestNeighbors(n_neighbors=2, algorithm='ball_tree').fit(train_data)
        distances, indices = nbrs.kneighbors(train_data)

        # Find nearest neighbor
        nearest_neighbor_index = indices[0][1]
        result = train_data.iloc[nearest_neighbor_index, :]
        result_borough = data_df.borocode[data_df.zipcode == result.zipcode].tolist()[0]
        
        # Define zipcode, neighborhood, and borough
        result_zipcode = int(result["zipcode"])
        result_neighborhood = data_df[data_df.zipcode == result["zipcode"]].neighborhood.tolist()[0]
        result_borough = data_df[data_df.zipcode == result["zipcode"]].borocode.tolist()[0]
        dictObj["manhattan"]["zipcode"] = result_zipcode
        dictObj["manhattan"]["neighborhood"] = result_neighborhood
        dictObj["manhattan"]["borough"] = result_borough
        
        for item in dictObj["manhattan"]["values"]:
            value_type = dictObj["manhattan"]["values"][item]["label"]
            dictObj["manhattan"]["values"][item]["GFA"] = result[value_type]

    return dictObj










@app.route("/")
def welcome():

    zipcode = 10016 #Murray Hill
    dictObj = run_query(zipcode)

    # Render index and pass values
    return render_template("index.html", data=dictObj) 





# @app.route("/api/value_type/<value_type>", methods=["POST"])
# def updateVal(value_type):

#     engine = create_engine("sqlite:///plutoDB.sqlite")
#     conn = engine.connect()

#     # Query
#     zip = values["zipcode"] # zipcode is already present, so pull it from the values dict, and query based on new value_type
#     results = pd.read_sql(f"SELECT {value_type} FROM pluto_table WHERE zipcode = {zip}", conn)
#     results_list = results.iloc[:, 0].tolist()

#     # Update values
#     values["value_type"] = str(value_type)    
#     values["values"] = results_list

#     return values





@app.route("/api/zipcode/<zipcode>", methods=["POST"])
def updateZip(zipcode):

    dictObj = run_query(zipcode)

    return dictObj





if __name__ == '__main__':
    app.run(debug=True)