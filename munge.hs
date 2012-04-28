
import Data.Aeson
import Data.Map hiding (filter,map)
import Data.ByteString.Lazy.Char8 (unpack)

toLines::String->[[Int]]
toLines = map (map readInt . words) . lines
    where readInt "--" = 0
          readInt n    = read $ filter (/= ',') n

toNested::[[Int]]->Map String (Map String Int)
toNested = fromList . map outer
    where outer (key:rest) = (show key, fields rest)

fields l = fromList $ map takeSum allFields
    where takeSum (key,vals) = (key,sum $ map (l!!) vals)
          allFields = [("Coal",[0])
                      ,("Petroleum",[1,2])
                      ,("Natural Gas",[3])
                     -- Four is other
                      ,("Nuclear",[5])
                      ,("Hydro",[6])
                      ,("Renwables",[7])
                      ,("Other",[4,9])]

toJsonBlob = unpack . encode . toNested . toLines