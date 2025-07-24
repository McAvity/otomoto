 plan a simple python app, that will read jsons from @backend/extracted_data/, and extract relevant information from them. use LLM (openai) with instructor, to extract information like:
- wether the webasto is istalled
- is air conditioning there
- size of the bed
- is the trunk big or small
- does the car have solar panels
- is the driver cabin connected with the back
- is there a kitchen sink with fresh/gray water
- is teh kitchen inside or outside (at the back)
- is there roof window
- does the car have back windows
- is the car stealth
- can you stand in the back of the car (does it have high roof)
- is there a loo
- does it have shower
- list of other things/accessories included, that were not included above

The descriptions are all in polish, so it may be better to use polish prompts? (optional)

Create a pydantic model that can hold the above informtion, use the model to ask instructor to get the data in the required format.
For each processed file in @backend/extracted_data/*.json, create an acompanying file in backend/parsed_data/*.json with data extracted using instructor.
